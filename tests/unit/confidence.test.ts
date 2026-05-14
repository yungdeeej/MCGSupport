import { describe, expect, it } from 'vitest';
import { hasEscalationKeyword, deriveConfidence } from '@/lib/ai/confidence';

describe('escalation keyword detection', () => {
  it('catches finance phrases', () => {
    expect(hasEscalationKeyword('How much do I owe?')).toBe(true);
    expect(hasEscalationKeyword('Can I get a refund?')).toBe(true);
    expect(hasEscalationKeyword('I want a payment plan')).toBe(true);
  });

  it('catches safety + immigration', () => {
    expect(hasEscalationKeyword('I need IRCC help')).toBe(true);
    expect(hasEscalationKeyword('I want to speak to a human')).toBe(true);
    expect(hasEscalationKeyword('thinking about self-harm')).toBe(true);
    expect(hasEscalationKeyword('study permit expired')).toBe(true);
  });

  it('ignores benign messages', () => {
    expect(hasEscalationKeyword('Where do I find my schedule?')).toBe(false);
    expect(hasEscalationKeyword("What's my Moodle URL?")).toBe(false);
  });
});

describe('confidence derivation', () => {
  it('downgrades to low when escalation keyword present', () => {
    expect(
      deriveConfidence({ userMessage: 'I need a refund', kbHits: [], toolErrorsCount: 0 }),
    ).toBe('low');
  });
  it('downgrades to low on tool errors', () => {
    expect(
      deriveConfidence({ userMessage: 'show schedule', kbHits: [], toolErrorsCount: 1 }),
    ).toBe('low');
  });
  it('high when strong KB hit present', () => {
    expect(
      deriveConfidence({
        userMessage: 'how do I reset my moodle password',
        kbHits: [
          {
            articleId: 1,
            slug: 'reset',
            title: 't',
            snippet: 's',
            category: 'moodle',
            score: 0.5,
            source: 'fused',
          },
        ],
        toolErrorsCount: 0,
      }),
    ).toBe('high');
  });
});
