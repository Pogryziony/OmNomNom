const WINDOW_MS = 60_000;

interface TokenBucket {
  tokens: number;
  lastRefill: number;
}

const buckets = new Map<string, TokenBucket>();

export interface RateLimitResult {
  limited: boolean;
  limit: number;
  remaining: number;
  reset: number;
  retryAfterSeconds?: number;
}

const refillTokens = (bucket: TokenBucket, limit: number, now: number) => {
  const elapsed = now - bucket.lastRefill;

  if (elapsed <= 0) {
    return;
  }

  const tokensToAdd = (elapsed / WINDOW_MS) * limit;
  bucket.tokens = Math.min(limit, bucket.tokens + tokensToAdd);
  bucket.lastRefill = now;
};

const getBucket = (key: string, limit: number, now: number) => {
  let bucket = buckets.get(key);

  if (!bucket) {
    bucket = {
      tokens: limit,
      lastRefill: now,
    };

    buckets.set(key, bucket);
    return bucket;
  }

  if (bucket.tokens > limit) {
    bucket.tokens = limit;
  }

  refillTokens(bucket, limit, now);
  return bucket;
};

const computeResetTimestamp = (bucket: TokenBucket, limit: number, now: number) => {
  const tokensNeeded = Math.max(0, limit - bucket.tokens);
  const msUntilFull = tokensNeeded === 0 ? 0 : (tokensNeeded / limit) * WINDOW_MS;

  return Math.ceil((now + msUntilFull) / 1000);
};

const calculateRetryAfter = (bucket: TokenBucket, limit: number) => {
  const tokensNeeded = 1 - bucket.tokens;
  if (tokensNeeded <= 0) {
    return 0;
  }

  const msUntilNextToken = (tokensNeeded / limit) * WINDOW_MS;
  return Math.max(1, Math.ceil(msUntilNextToken / 1000));
};

export const consumeRateLimit = (key: string, limit: number, now = Date.now()): RateLimitResult => {
  const bucket = getBucket(key, limit, now);
  const reset = computeResetTimestamp(bucket, limit, now);

  if (bucket.tokens >= 1) {
    bucket.tokens -= 1;

    return {
      limited: false,
      limit,
      remaining: Math.max(0, Math.floor(bucket.tokens)),
      reset,
    };
  }

  return {
    limited: true,
    limit,
    remaining: 0,
    reset,
    retryAfterSeconds: calculateRetryAfter(bucket, limit),
  };
};
