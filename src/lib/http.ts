import type { ApiErrorResponse } from '@/types';

export interface HttpError extends Error {
  status: number;
  body?: unknown;
}

export function makeAuthHeaders(accessToken?: string): Record<string, string> {
  if (!accessToken) return {};
  return { Authorization: `Bearer ${accessToken}` };
}

export function isApiErrorResponse(value: unknown): value is ApiErrorResponse {
  return (
    typeof value === 'object' &&
    value !== null &&
    'error' in value &&
    typeof (value as ApiErrorResponse).error === 'object' &&
    (value as ApiErrorResponse).error !== null
  );
}

export async function fetchJson<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const response = await fetch(path, init);

  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const body = isJson ? await response.json().catch(() => undefined) : undefined;

  if (!response.ok) {
    const message =
      isApiErrorResponse(body) ? body.error.message : `Request failed (${response.status})`;

    const error = new Error(message) as HttpError;
    error.status = response.status;
    error.body = body;
    throw error;
  }

  return body as T;
}
