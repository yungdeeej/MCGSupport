import { describe, expect, it } from 'vitest';
import { chunkMarkdown } from '@/lib/kb/chunker';

describe('chunkMarkdown', () => {
  it('returns no chunks for empty input', () => {
    expect(chunkMarkdown('Empty', '')).toEqual([]);
  });

  it('emits at least one chunk for a short article', () => {
    const c = chunkMarkdown('Test', '# Heading\n\nA short paragraph.');
    expect(c.length).toBeGreaterThanOrEqual(1);
    expect(c[0]!.metadata.title).toBe('Test');
  });

  it('keeps section heading metadata', () => {
    const md = `# A\n\nfirst section content here.\n\n# B\n\nsecond section content here.\n`;
    const c = chunkMarkdown('Doc', md);
    const headings = c.map((x) => x.metadata.section);
    expect(headings).toContain('A');
  });

  it('splits very long content into multiple chunks', () => {
    const big = 'word '.repeat(800); // ~800 tokens
    const md = `# Big\n\n${big}`;
    const c = chunkMarkdown('Big', md);
    expect(c.length).toBeGreaterThan(1);
  });
});
