/**
 * Simple In-Memory Rate Limiter
 *
 * For production with multiple instances, use Redis-based rate limiting
 * This implementation works for single-instance deployments
 */

// Store request counts: { ip: { count: number, resetTime: number } }
const requestStore = new Map();

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of requestStore.entries()) {
    if (value.resetTime < now) {
      requestStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Rate limit configuration
 * @param {number} maxRequests - Maximum requests allowed in the window
 * @param {number} windowMs - Time window in milliseconds
 */
export function rateLimit({ maxRequests = 5, windowMs = 60 * 1000 }) {
  return {
    /**
     * Check if request should be allowed
     * @param {string} identifier - Usually IP address or user ID
     * @returns {{ success: boolean, remaining: number, resetIn: number }}
     */
    check(identifier) {
      const now = Date.now();
      const key = identifier;

      const existing = requestStore.get(key);

      // If no existing record or window expired, create new
      if (!existing || existing.resetTime < now) {
        requestStore.set(key, {
          count: 1,
          resetTime: now + windowMs,
        });
        return {
          success: true,
          remaining: maxRequests - 1,
          resetIn: windowMs,
        };
      }

      // If within window and under limit
      if (existing.count < maxRequests) {
        existing.count++;
        return {
          success: true,
          remaining: maxRequests - existing.count,
          resetIn: existing.resetTime - now,
        };
      }

      // Over limit
      return {
        success: false,
        remaining: 0,
        resetIn: existing.resetTime - now,
      };
    },
  };
}

/**
 * Get client IP from request headers
 * Works with Vercel, Cloudflare, and other proxies
 */
export function getClientIP(request) {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }

  // Fallback for development
  return '127.0.0.1';
}

// Pre-configured rate limiters for common use cases
export const authLimiter = rateLimit({
  maxRequests: 5,
  windowMs: 15 * 60 * 1000, // 5 requests per 15 minutes
});

export const passwordResetLimiter = rateLimit({
  maxRequests: 3,
  windowMs: 60 * 60 * 1000, // 3 requests per hour
});

export const apiLimiter = rateLimit({
  maxRequests: 100,
  windowMs: 60 * 1000, // 100 requests per minute
});
