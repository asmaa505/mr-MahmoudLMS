const ipCache = new Map<string, { count: number; resetAt: number }>();

/**
 * Basic in-memory IP token-bucket rate limiter.
 * Default window is 1 minute (60000ms).
 */
export function rateLimit(
  ip: string,
  limit: number = 20,
  windowMs: number = 60000
): { success: boolean; limit: number; remaining: number; reset: number } {
  const now = Date.now();
  const record = ipCache.get(ip);

  if (!record || now > record.resetAt) {
    const resetAt = now + windowMs;
    ipCache.set(ip, { count: 1, resetAt });
    return { success: true, limit, remaining: limit - 1, reset: resetAt };
  }

  if (record.count >= limit) {
    return { success: false, limit, remaining: 0, reset: record.resetAt };
  }

  record.count += 1;
  return { success: true, limit, remaining: limit - record.count, reset: record.resetAt };
}

/**
 * Resets the in-memory rate limiting log records (helpful for tests).
 */
export function resetRateLimitCache(): void {
  ipCache.clear();
}
