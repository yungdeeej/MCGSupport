import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { hybridSearch } from '@/lib/kb/search';
import { rateLimit } from '@/lib/ratelimit';
import { errorResponse, ipFrom } from '@/lib/http-helpers';

const Body = z.object({
  q: z.string().min(1).max(200),
  category: z.string().optional(),
  limit: z.number().int().min(1).max(20).default(10),
});

export async function POST(req: NextRequest) {
  try {
    const ip = ipFrom(req) ?? 'unknown';
    const rl = await rateLimit('searchPerIp', ip);
    if (!rl.allowed) {
      return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
    }
    const body = Body.parse(await req.json());
    const hits = await hybridSearch(body.q, { category: body.category, limit: body.limit });
    return NextResponse.json({ hits });
  } catch (err) {
    return errorResponse(err);
  }
}
