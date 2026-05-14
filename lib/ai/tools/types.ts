import { z } from 'zod';
import type { SessionData } from '../../auth/session';

/**
 * Every AI tool follows the same contract:
 *
 *   - inputSchema: zod schema for the JSON input from the model
 *   - outputSchema: zod schema for the structured output to the model
 *   - handler: takes (input, ctx) where ctx carries the *server-injected*
 *     studentId — the model never sees it
 */
export interface ToolContext {
  session: SessionData;
  studentId: number;
  conversationId: number;
  ip?: string;
}

export interface Tool<I, O> {
  name: string;
  description: string;
  inputSchema: z.ZodType<I>;
  outputSchema: z.ZodType<O>;
  /** If true, the tool requires re-auth before it can execute. */
  sensitive?: boolean;
  /** If true, the model must ask the student for confirmation before calling. */
  requiresConfirmation?: boolean;
  handler: (input: I, ctx: ToolContext) => Promise<O>;
}

export type AnyTool = Tool<unknown, unknown>;

export function asAnyTool<I, O>(t: Tool<I, O>): AnyTool {
  return t as unknown as AnyTool;
}
