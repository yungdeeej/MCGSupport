import Anthropic from '@anthropic-ai/sdk';
import { env } from '../env';

let _client: Anthropic | null = null;
export function anthropic(): Anthropic {
  if (!_client) {
    _client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  }
  return _client;
}

/**
 * Token pricing per 1M tokens for cost tracking.
 * Source: anthropic.com/pricing (Sonnet tier, May 2026).
 */
export const PRICING = {
  inputPer1M: 3.0,
  outputPer1M: 15.0,
  cacheReadPer1M: 0.3,
  cacheWritePer1M: 3.75,
};

export function computeCostCents(tokensIn: number, tokensOut: number): number {
  const usd = (tokensIn / 1_000_000) * PRICING.inputPer1M + (tokensOut / 1_000_000) * PRICING.outputPer1M;
  // CAD ≈ 1.36 USD as of May 2026 — fine for rough budgeting.
  const cad = usd * 1.36;
  return Math.round(cad * 100);
}
