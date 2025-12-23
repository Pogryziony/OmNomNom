import { randomUUID } from 'node:crypto';
import { defineMiddleware } from 'astro:middleware';

import { createSupabaseClient, supabaseClient } from '@/db/supabase.client';
import { consumeRateLimit } from '@/lib/rateLimiter';
import { logApiRequest, sanitizeHeaders } from '@/lib/logger';

type MiddlewareContext = Parameters<ReturnType<typeof defineMiddleware>>[0];

const AUTHENTICATED_LIMIT = 100;
const ANONYMOUS_LIMIT = 20;
const RATE_LIMIT_EXCLUDED_PATHS = new Set(['/api/docs', '/api/openapi.json']);

const extractBearerToken = (header?: string | null) => {
  if (!header) {
    return null;
  }

  const match = header.match(/^Bearer\s+(.*)$/i);
  return match ? match[1].trim() : null;
};

const createRequestId = () => {
  try {
    return randomUUID();
  } catch {
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
};

const resolveClientIp = (context: MiddlewareContext) => {
  try {
    return context.clientAddress;
  } catch {
    return context.request.headers.get('x-forwarded-for') ?? undefined;
  }
};

export const onRequest = defineMiddleware(async (context, next) => {
  context.locals.supabase = supabaseClient;

  if (!context.url.pathname.startsWith('/api/')) {
    return next();
  }

  if (RATE_LIMIT_EXCLUDED_PATHS.has(context.url.pathname)) {
    return next();
  }

  const startTime = Date.now();
  const requestId = createRequestId();
  const requestHeaders = sanitizeHeaders(context.request.headers);
  const clientIp = resolveClientIp(context);

  const token = extractBearerToken(context.request.headers.get('authorization'));

  // Ensure all downstream API handlers run Supabase queries under the JWT,
  // so Postgres RLS policies based on auth.uid() work for inserts/updates.
  context.locals.supabase = createSupabaseClient(token ?? undefined);

  let authenticatedUserId: string | undefined;

  if (token) {
    try {
      const { data, error } = await context.locals.supabase.auth.getUser(token);
      if (!error && data.user) {
        authenticatedUserId = data.user.id;
      }
    } catch (error) {
      console.warn('Rate limiter could not validate token:', error);
    }
  }

  const isAuthenticated = Boolean(authenticatedUserId);
  const limit = isAuthenticated ? AUTHENTICATED_LIMIT : ANONYMOUS_LIMIT;
  const key = isAuthenticated
    ? `user:${authenticatedUserId}`
    : `ip:${clientIp ?? 'unknown'}`;

  const rateLimitState = consumeRateLimit(key, limit);

  const applyRateLimitHeaders = (response: Response) => {
    response.headers.set('X-RateLimit-Limit', rateLimitState.limit.toString());
    response.headers.set('X-RateLimit-Remaining', rateLimitState.remaining.toString());
    response.headers.set('X-RateLimit-Reset', rateLimitState.reset.toString());
    return response;
  };

  const finalizeResponse = (response: Response, extra?: { limited?: boolean; error?: string }) => {
    const responseWithHeaders = applyRateLimitHeaders(response);

    logApiRequest({
      requestId,
      method: context.request.method,
      path: context.url.pathname,
      query: context.url.search || undefined,
      clientIp,
      status: responseWithHeaders.status,
      durationMs: Date.now() - startTime,
      requestHeaders,
      responseHeaders: sanitizeHeaders(responseWithHeaders.headers),
      rateLimit: {
        limit,
        remaining: Number(responseWithHeaders.headers.get('X-RateLimit-Remaining')) || rateLimitState.remaining,
        reset: rateLimitState.reset,
        limited: Boolean(extra?.limited ?? rateLimitState.limited),
      },
      limited: extra?.limited ?? rateLimitState.limited,
      error: extra?.error,
    });

    return responseWithHeaders;
  };

  if (rateLimitState.limited) {
    const retryAfter = rateLimitState.retryAfterSeconds ?? 60;
    const limitedResponse = new Response(
      JSON.stringify({
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests. Please try again later.',
          retry_after: retryAfter,
        },
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': retryAfter.toString(),
        },
      },
    );

    return finalizeResponse(limitedResponse, { limited: true });
  }

  try {
    const response = await next();
    return finalizeResponse(response, { limited: false });
  } catch (error) {
    logApiRequest({
      requestId,
      method: context.request.method,
      path: context.url.pathname,
      query: context.url.search || undefined,
      clientIp,
      status: 500,
      durationMs: Date.now() - startTime,
      requestHeaders,
      rateLimit: {
        limit,
        remaining: rateLimitState.remaining,
        reset: rateLimitState.reset,
        limited: false,
      },
      limited: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    throw error;
  }
});
