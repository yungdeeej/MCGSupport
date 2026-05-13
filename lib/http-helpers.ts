import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { logger } from './logger';
import { UnauthorizedError, ForbiddenError, ReauthRequiredError } from './auth/session';
import { InvalidTokenError } from './auth/magicLink';
import { HttpError } from './http';

/** Translate domain errors into JSON responses without leaking internals. */
export function errorResponse(err: unknown) {
  if (err instanceof ZodError) {
    return NextResponse.json(
      { error: 'invalid_input', issues: err.issues },
      { status: 400 },
    );
  }
  if (err instanceof UnauthorizedError) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (err instanceof ReauthRequiredError) {
    return NextResponse.json({ error: 'reauth_required' }, { status: 403 });
  }
  if (err instanceof ForbiddenError) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  if (err instanceof InvalidTokenError) {
    return NextResponse.json({ error: 'invalid_token' }, { status: 400 });
  }
  if (err instanceof HttpError) {
    return NextResponse.json(
      { error: 'upstream', status: err.status },
      { status: err.status >= 500 ? 502 : err.status },
    );
  }
  logger.error({ err }, 'unhandled route error');
  return NextResponse.json({ error: 'internal' }, { status: 500 });
}

export function ipFrom(req: Request): string | undefined {
  const fwd = req.headers.get('x-forwarded-for');
  return fwd?.split(',')[0]?.trim();
}

export function uaFrom(req: Request): string | undefined {
  return req.headers.get('user-agent') ?? undefined;
}
