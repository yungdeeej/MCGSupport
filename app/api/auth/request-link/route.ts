import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requestMagicLink } from '@/lib/auth/magicLink';
import { rateLimit } from '@/lib/ratelimit';
import { errorResponse, ipFrom } from '@/lib/http-helpers';

const Body = z.object({ email: z.string().email().max(254), next: z.string().optional() });

export async function POST(req: NextRequest) {
  try {
    const body = Body.parse(await req.json());
    const ip = ipFrom(req) ?? 'unknown';
    const [byIp, byEmail] = await Promise.all([
      rateLimit('magicLinkPerIp', ip),
      rateLimit('magicLinkPerEmail', body.email.toLowerCase()),
    ]);
    if (!byIp.allowed || !byEmail.allowed) {
      return NextResponse.json(
        { ok: false, error: 'rate_limited' },
        {
          status: 429,
          headers: { 'retry-after': String(Math.max(byIp.retryAfterMs, byEmail.retryAfterMs)) },
        },
      );
    }
    await requestMagicLink({ email: body.email, ip });
    // Always success-shaped, even for unknown emails.
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
