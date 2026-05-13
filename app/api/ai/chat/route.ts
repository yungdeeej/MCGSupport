import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth/session';
import { runChat, type SSEEvent } from '@/lib/ai/runtime';
import { rateLimit } from '@/lib/ratelimit';
import { errorResponse, ipFrom } from '@/lib/http-helpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z.object({
  message: z.string().min(1).max(4000),
  conversationId: z.number().int().positive().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session || session.userType !== 'student') {
      return new Response('unauthorized', { status: 401 });
    }
    const ip = ipFrom(req) ?? 'unknown';
    const [byUser, byIp] = await Promise.all([
      rateLimit('aiChatPerStudent', String(session.userId)),
      rateLimit('aiChatPerIp', ip),
    ]);
    if (!byUser.allowed || !byIp.allowed) {
      return new Response('rate_limited', {
        status: 429,
        headers: { 'retry-after': String(Math.max(byUser.retryAfterMs, byIp.retryAfterMs)) },
      });
    }
    const body = Body.parse(await req.json());

    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const send = (e: SSEEvent) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(e)}\n\n`));
        };
        try {
          await runChat({
            session,
            studentId: session.userId,
            conversationId: body.conversationId,
            userMessage: body.message,
            ip,
            onEvent: send,
          });
        } catch (err) {
          send({ type: 'error', message: err instanceof Error ? err.message : 'unknown error' });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'content-type': 'text/event-stream; charset=utf-8',
        'cache-control': 'no-cache, no-transform',
        'x-accel-buffering': 'no',
      },
    });
  } catch (err) {
    return errorResponse(err);
  }
}
