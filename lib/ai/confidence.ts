import type { SearchHit } from '../kb/search';

export type Confidence = 'high' | 'medium' | 'low';

const ESCALATION_KEYWORDS = [
  'refund',
  'withdraw',
  'withdrawal',
  'drop out',
  'harassment',
  'bully',
  'racism',
  'sexism',
  'discriminat',
  'accommodation',
  'mental health',
  'suicid',
  'self harm',
  'self-harm',
  'abuse',
  'immigration',
  'ircc',
  'study permit',
  'work permit',
  'pr application',
  'permanent residence',
  'lawyer',
  'legal',
  'lawsuit',
  'complaint',
  'speak to a manager',
  'speak to a human',
  'talk to a human',
  'tuition balance',
  'how much do i owe',
  'payment plan',
];

export function hasEscalationKeyword(text: string): boolean {
  const lower = text.toLowerCase();
  return ESCALATION_KEYWORDS.some((k) => lower.includes(k));
}

export function deriveConfidence(args: {
  userMessage: string;
  kbHits: SearchHit[];
  toolErrorsCount: number;
}): Confidence {
  if (hasEscalationKeyword(args.userMessage) || args.toolErrorsCount > 0) {
    return 'low';
  }
  const topScore = args.kbHits[0]?.score ?? 0;
  if (topScore >= 0.03) return 'high'; // RRF inverse-rank; first hit at rank 1 ~ 1/61
  if (topScore > 0) return 'medium';
  return 'medium';
}
