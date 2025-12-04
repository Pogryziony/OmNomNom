const REDACTED_VALUE = '[REDACTED]';
const SENSITIVE_HEADERS = new Set(['authorization', 'proxy-authorization', 'cookie', 'set-cookie']);

export interface ApiRateLimitLog {
  limit: number;
  remaining: number;
  reset: number;
  limited: boolean;
}

export interface ApiRequestLogEntry {
  requestId: string;
  method: string;
  path: string;
  query?: string;
  clientIp?: string;
  status: number;
  durationMs: number;
  requestHeaders?: Record<string, string>;
  responseHeaders?: Record<string, string>;
  rateLimit?: ApiRateLimitLog;
  limited?: boolean;
  error?: string;
}

export const sanitizeHeaders = (headers: Headers) => {
  const sanitized: Record<string, string> = {};

  headers.forEach((value, key) => {
    const normalizedKey = key.toLowerCase();
    if (SENSITIVE_HEADERS.has(normalizedKey)) {
      sanitized[normalizedKey] = REDACTED_VALUE;
      return;
    }

    sanitized[normalizedKey] = value;
  });

  return sanitized;
};

const resolveLogLevel = (status: number) => {
  if (status >= 500) {
    return 'error';
  }

  if (status >= 400) {
    return 'warn';
  }

  return 'info';
};

export const logApiRequest = (entry: ApiRequestLogEntry) => {
  const payload = {
    timestamp: new Date().toISOString(),
    level: resolveLogLevel(entry.status),
    event: 'api_request',
    ...entry,
  };

  console.log(JSON.stringify(payload));
};
