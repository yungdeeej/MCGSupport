import OpenAI from 'openai';
import { env } from '../env';

let _openai: OpenAI | null = null;
function openai(): OpenAI {
  if (!_openai) _openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  return _openai;
}

/** Single-shot embedding. Returns a 1536-d float array. */
export async function embed(text: string): Promise<number[]> {
  const res = await openai().embeddings.create({
    model: env.OPENAI_EMBED_MODEL,
    input: text,
  });
  const v = res.data[0]?.embedding;
  if (!v) throw new Error('no embedding returned');
  return v;
}

/** Batched embeddings — OpenAI accepts up to ~2048 per request. */
export async function embedBatch(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const res = await openai().embeddings.create({
    model: env.OPENAI_EMBED_MODEL,
    input: texts,
  });
  return res.data.map((d) => d.embedding);
}
