/**
 * Simple in-memory rate limiter for high-risk public endpoints.
 * 
 * NOTE: This implementation has limitations in serverless environments:
 * - Rate limit state is not shared across function instances
 * - State resets when serverless functions cold-start
 * 
 * For production-grade rate limiting, consider:
 * - Vercel KV (Redis)
 * - Upstash Redis
 * - Cloudflare Rate Limiting
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

/**
 * Rate limit configuration for different endpoint types
 */
export const RATE_LIMIT_CONFIG = {
  /** AI chat - strict limit due to API costs */
  ai: { limit: 10, windowMs: 60 * 1000 }, // 10 requests per minute
  /** Login attempts - prevent brute force */
  login: { limit: 5, windowMs: 60 * 1000 }, // 5 attempts per minute
  /** Checkout - prevent payment abuse */
  checkout: { limit: 10, windowMs: 60 * 1000 }, // 10 attempts per minute
} as const;

type RateLimitType = keyof typeof RATE_LIMIT_CONFIG;

/**
 * Get client IP from request headers
 */
function getClientIp(headers: Headers): string {
  // Check common proxy headers
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  const realIp = headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }
  
  return 'unknown';
}

/**
 * Check if request should be rate limited
 * Returns { allowed: true } if request is allowed
 * Returns { allowed: false, retryAfter } if rate limited
 */
export function checkRateLimit(
  type: RateLimitType,
  headers: Headers
): { allowed: boolean; retryAfter?: number } {
  const config = RATE_LIMIT_CONFIG[type];
  const ip = getClientIp(headers);
  const key = `${type}:${ip}`;
  const now = Date.now();
  
  const existing = store.get(key);
  
  if (!existing || now > existing.resetAt) {
    // New window
    store.set(key, {
      count: 1,
      resetAt: now + config.windowMs,
    });
    return { allowed: true };
  }
  
  if (existing.count >= config.limit) {
    // Rate limited
    const retryAfter = Math.ceil((existing.resetAt - now) / 1000);
    return { allowed: false, retryAfter };
  }
  
  // Increment count
  existing.count++;
  store.set(key, existing);
  return { allowed: true };
}

/**
 * Clean up expired entries to prevent memory leaks
 * Should be called periodically
 */
export function cleanupRateLimitStore(): void {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (now > entry.resetAt) {
      store.delete(key);
    }
  }
}

// Auto-cleanup every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupRateLimitStore, 5 * 60 * 1000);
}
