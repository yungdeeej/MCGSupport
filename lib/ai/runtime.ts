import { anthropic, computeCostCents } from './client';
import { allTools, toolMap, toolsForAnthropic } from './tools';
import type { AnyTool, ToolContext } from './tools/types';
import { getStudentAssistantSystemPrompt, PROMPT_VERSION } from './prompts';
import { hybridSearch, type SearchHit } from '../kb/search';
import { deriveConfidence, hasEscalationKeyword } from './confidence';
import { db } from '../db';
import { aiConversations, aiMessages } from '../db/schema';
import { eq } from 'drizzle-orm';
import { env } from '../env';
import type { SessionData } from '../auth/session';
import { isReauthValid } from '../auth/session';
import { logger } from '../logger';
import { audit, auditActions } from '../audit';
import type Anthropic from '@anthropic-ai/sdk';

type MessageParam = Anthropic.Messages.MessageParam;
type ToolUseBlock = Anthropic.Messages.ToolUseBlock;
type ContentBlock = Anthropic.Messages.ContentBlock;

const MAX_TOOL_TURNS = 6;

/* --------- SSE event types (sent to the client) --------- */
export type SSEEvent =
  | { type: 'meta'; conversationId: number }
  | { type: 'text_delta'; text: string }
  | { type: 'tool_use_start'; name: string; toolUseId: string }
  | { type: 'tool_use_result'; name: string; ok: boolean; preview?: string }
  | { type: 'confidence'; level: 'high' | 'medium' | 'low' }
  | { type: 'kb_citations'; hits: Array<{ slug: string; title: string }> }
  | { type: 'reauth_required'; tool: string }
  | { type: 'usage'; tokensIn: number; tokensOut: number; costCents: number }
  | { type: 'done' }
  | { type: 'error'; message: string };

/* --------- public entry point --------- */

export interface RunChatArgs {
  session: SessionData;
  studentId: number;
  conversationId?: number;
  userMessage: string;
  ip?: string;
  onEvent: (e: SSEEvent) => void | Promise<void>;
}

export async function runChat(args: RunChatArgs): Promise<void> {
  let { conversationId } = args;
  if (!conversationId) {
    const [c] = await db
      .insert(aiConversations)
      .values({ studentId: args.studentId, sessionId: args.session.id })
      .returning({ id: aiConversations.id });
    if (!c) throw new Error('failed to start conversation');
    conversationId = c.id;
  }
  await args.onEvent({ type: 'meta', conversationId });

  // Persist the user's message.
  await db.insert(aiMessages).values({
    conversationId,
    role: 'user',
    content: [{ type: 'text', text: args.userMessage }],
  });

  // 1) RAG: gather KB context up-front so the model has it on the first turn.
  let kbHits: SearchHit[] = [];
  try {
    kbHits = await hybridSearch(args.userMessage, { limit: 5 });
  } catch (err) {
    logger.warn({ err }, 'RAG prefetch failed; proceeding without KB context');
  }
  if (kbHits.length) {
    await args.onEvent({
      type: 'kb_citations',
      hits: kbHits.slice(0, 3).map((h) => ({ slug: h.slug, title: h.title })),
    });
  }

  // 2) Reconstruct prior conversation messages (cap to last 20 to control cost).
  const prior = await db
    .select()
    .from(aiMessages)
    .where(eq(aiMessages.conversationId, conversationId))
    .orderBy(aiMessages.id)
    .limit(40);

  const messages: MessageParam[] = prior.map((m) => ({
    role: m.role === 'tool_result' ? 'user' : (m.role as 'user' | 'assistant'),
    content: m.content as unknown as ContentBlock[],
  }));

  const systemPrompt = buildSystemPrompt(kbHits);
  const tools = toolsForAnthropic();

  // 3) Tool-calling loop.
  let totalIn = 0;
  let totalOut = 0;
  let toolErrors = 0;

  for (let turn = 0; turn < MAX_TOOL_TURNS; turn++) {
    const start = Date.now();
    const stream = await anthropic().messages.stream({
      model: env.ANTHROPIC_MODEL,
      max_tokens: 1024,
      system: systemPrompt,
      tools,
      messages,
    });

    for await (const event of stream) {
      if (event.type === 'content_block_start') {
        if (event.content_block.type === 'tool_use') {
          await args.onEvent({
            type: 'tool_use_start',
            name: event.content_block.name,
            toolUseId: event.content_block.id,
          });
        }
      } else if (event.type === 'content_block_delta') {
        if (event.delta.type === 'text_delta') {
          await args.onEvent({ type: 'text_delta', text: event.delta.text });
        }
      }
    }
    const final = await stream.finalMessage();
    totalIn += final.usage.input_tokens;
    totalOut += final.usage.output_tokens;

    const finalBlocks = final.content as ContentBlock[];
    messages.push({ role: 'assistant', content: finalBlocks });

    await db.insert(aiMessages).values({
      conversationId,
      role: 'assistant',
      content: finalBlocks as unknown as object,
      tokensIn: final.usage.input_tokens,
      tokensOut: final.usage.output_tokens,
      latencyMs: Date.now() - start,
    });

    const toolUses = finalBlocks.filter((b): b is ToolUseBlock => b.type === 'tool_use');
    if (toolUses.length === 0) break;

    const toolResults: ContentBlock[] = [];
    for (const use of toolUses) {
      const tool = toolMap.get(use.name);
      if (!tool) {
        toolErrors++;
        toolResults.push({
          type: 'tool_result',
          tool_use_id: use.id,
          content: `unknown tool: ${use.name}`,
          is_error: true,
        } as ContentBlock);
        continue;
      }

      // Gate sensitive tools behind re-auth.
      if (tool.sensitive && !isReauthValid(args.session)) {
        toolErrors++;
        await args.onEvent({ type: 'reauth_required', tool: tool.name });
        toolResults.push({
          type: 'tool_result',
          tool_use_id: use.id,
          content:
            'reauth_required: This action is sensitive. Tell the student they need to confirm it’s them, then send them to the re-auth flow before retrying. Do NOT call this tool again until they reauth.',
          is_error: true,
        } as ContentBlock);
        continue;
      }

      try {
        const parsed = tool.inputSchema.parse(use.input);
        const ctx: ToolContext = {
          session: args.session,
          studentId: args.studentId,
          conversationId,
          ip: args.ip,
        };
        const out = await tool.handler(parsed, ctx);
        await args.onEvent({
          type: 'tool_use_result',
          name: tool.name,
          ok: true,
          preview: previewOf(out),
        });
        toolResults.push({
          type: 'tool_result',
          tool_use_id: use.id,
          content: JSON.stringify(out),
          is_error: false,
        } as ContentBlock);
      } catch (err) {
        toolErrors++;
        const message = err instanceof Error ? err.message : 'tool error';
        logger.error({ tool: tool.name, err }, 'tool execution failed');
        await args.onEvent({ type: 'tool_use_result', name: tool.name, ok: false });
        toolResults.push({
          type: 'tool_result',
          tool_use_id: use.id,
          content: `error: ${message}`,
          is_error: true,
        } as ContentBlock);
      }
    }

    messages.push({ role: 'user', content: toolResults });
    await db.insert(aiMessages).values({
      conversationId,
      role: 'tool_result',
      content: toolResults as unknown as object,
    });
  }

  // 4) Confidence + persistence.
  const confidence = deriveConfidence({
    userMessage: args.userMessage,
    kbHits,
    toolErrorsCount: toolErrors,
  });
  await args.onEvent({ type: 'confidence', level: confidence });

  const costCents = computeCostCents(totalIn, totalOut);
  await db
    .update(aiConversations)
    .set({
      totalTokensIn: totalIn,
      totalTokensOut: totalOut,
      costCents,
    })
    .where(eq(aiConversations.id, conversationId));

  await args.onEvent({ type: 'usage', tokensIn: totalIn, tokensOut: totalOut, costCents });

  if (hasEscalationKeyword(args.userMessage)) {
    await audit({
      actor: { type: 'student', id: args.studentId },
      action: 'AI_ESCALATION_KEYWORD',
      payload: { confidence },
      ip: args.ip,
    });
  }

  await args.onEvent({ type: 'done' });
}

function buildSystemPrompt(hits: SearchHit[]): string {
  const base = getStudentAssistantSystemPrompt();
  const kbBlock = hits.length
    ? '\n\n<knowledge_base>\n' +
      hits
        .slice(0, 3)
        .map(
          (h, i) =>
            `[${i + 1}] ${h.title} (slug: ${h.slug}, category: ${h.category})\n${truncate(h.snippet, 600)}`,
        )
        .join('\n\n') +
      '\n</knowledge_base>\n'
    : '';
  return `${base}\n\nPrompt version: ${PROMPT_VERSION}.${kbBlock}`;
}

function truncate(s: string, n: number): string {
  return s.length <= n ? s : s.slice(0, n) + '…';
}

function previewOf(value: unknown): string {
  try {
    return truncate(typeof value === 'string' ? value : JSON.stringify(value), 200);
  } catch {
    return '';
  }
}

// quiet unused-export warning
void allTools;
