/**
 * Markdown chunker. Splits by H1/H2/H3 headings, then packs runs of paragraphs
 * into 500–800 token chunks with ~50-token overlap so embeddings keep some
 * context across boundaries.
 *
 * Token counts are approximated as len/4 (the standard heuristic for
 * English). For our text-embedding-3-small budget this is more than precise
 * enough — embedding cost is fractions of a cent.
 */

export interface Chunk {
  index: number;
  text: string;
  metadata: { section: string | null; title: string };
}

const TARGET_MIN = 500;
const TARGET_MAX = 800;
const OVERLAP_TOKENS = 50;

function approxTokens(s: string) {
  return Math.ceil(s.length / 4);
}

export function chunkMarkdown(title: string, md: string): Chunk[] {
  const lines = md.split('\n');
  const sections: Array<{ heading: string | null; body: string[] }> = [];
  let current: { heading: string | null; body: string[] } = { heading: null, body: [] };
  for (const line of lines) {
    if (/^#{1,3}\s+/.test(line)) {
      if (current.body.length) sections.push(current);
      current = { heading: line.replace(/^#{1,3}\s+/, '').trim(), body: [] };
    } else {
      current.body.push(line);
    }
  }
  if (current.body.length) sections.push(current);

  const chunks: Chunk[] = [];
  let buffer = '';
  let currentHeading: string | null = null;
  let idx = 0;

  const flush = (heading: string | null) => {
    const text = buffer.trim();
    if (!text) return;
    chunks.push({
      index: idx++,
      text: heading ? `# ${heading}\n\n${text}` : text,
      metadata: { section: heading, title },
    });
    // overlap: keep the last ~50 tokens for next chunk
    const overlapChars = OVERLAP_TOKENS * 4;
    buffer = text.length > overlapChars ? text.slice(-overlapChars) : '';
  };

  for (const s of sections) {
    if (currentHeading && currentHeading !== s.heading) {
      flush(currentHeading);
    }
    currentHeading = s.heading;
    for (const para of s.body.join('\n').split(/\n{2,}/)) {
      const candidate = buffer ? `${buffer}\n\n${para}` : para;
      if (approxTokens(candidate) > TARGET_MAX) {
        flush(currentHeading);
        buffer = para;
      } else {
        buffer = candidate;
      }
      if (approxTokens(buffer) >= TARGET_MIN) {
        flush(currentHeading);
      }
    }
  }
  if (buffer.trim()) flush(currentHeading);
  return chunks;
}
