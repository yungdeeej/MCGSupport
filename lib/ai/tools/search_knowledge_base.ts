import { z } from 'zod';
import { asAnyTool, type Tool } from './types';
import { hybridSearch } from '../../kb/search';
import { audit, toolCallAction } from '../../audit';

const Input = z.object({
  query: z.string().min(2).max(200),
  category: z.string().optional(),
});

const Output = z.object({
  results: z.array(
    z.object({
      title: z.string(),
      snippet: z.string(),
      slug: z.string(),
      relevance: z.number(),
    }),
  ),
});

export const searchKnowledgeBase = asAnyTool({
  name: 'search_knowledge_base',
  description:
    'Searches the MCG Knowledge Base for articles on policies, processes, and how-tos. Use this BEFORE answering any procedural question.',
  inputSchema: Input,
  outputSchema: Output,
  handler: async (input, ctx) => {
    const hits = await hybridSearch(input.query, { category: input.category, limit: 5 });
    await audit({
      actor: { type: 'ai' },
      action: toolCallAction('search_knowledge_base'),
      resourceType: 'kb_search',
      payload: { query: input.query, category: input.category, hits: hits.length },
      ip: ctx.ip,
    });
    return {
      results: hits.map((h) => ({
        title: h.title,
        snippet: h.snippet,
        slug: h.slug,
        relevance: h.score,
      })),
    };
  },
} satisfies Tool<z.infer<typeof Input>, z.infer<typeof Output>>);
