import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { zodToJsonSchema } from '@/lib/ai/tools/zod-to-json';

describe('zodToJsonSchema', () => {
  it('emits object with required fields', () => {
    const s = z.object({ query: z.string().min(2), limit: z.number().optional() });
    const j = zodToJsonSchema(s);
    expect(j).toMatchObject({
      type: 'object',
      properties: {
        query: { type: 'string', minLength: 2 },
        limit: { type: 'number' },
      },
      required: ['query'],
    });
  });

  it('handles enums', () => {
    const s = z.object({ when: z.enum(['today', 'tomorrow', 'this_week']) });
    const j = zodToJsonSchema(s) as { properties: { when: { type: string; enum: string[] } } };
    expect(j.properties.when.enum).toEqual(['today', 'tomorrow', 'this_week']);
  });
});
