import type { RequestHandler } from "express";
import { redis } from "../infrastructure/redis/connection";
import { ErrorCode } from "@flashurl/errors";
import { sendGatewayError } from "../utils/gateway-error";

interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
  scope: string;
  message?: string;
}

// Atomic Redis operation:
// Increment the counter and set its expiry in one operation.
const RATE_LIMIT_SCRIPT = `
  local current = redis.call("INCR", KEYS[1])
  local ttl = redis.call("PTTL", KEYS[1])

  if ttl < 0 then
    redis.call("PEXPIRE", KEYS[1], ARGV[1])
    ttl = tonumber(ARGV[1])
  end

  return { current, ttl }
`;

export function rateLimiter(options: RateLimitOptions): RequestHandler {
  const { windowMs, maxRequests } = options;

  if (
    !Number.isInteger(windowMs) ||
    windowMs <= 0 ||
    !Number.isInteger(maxRequests) ||
    maxRequests <= 0
  ) {
    throw new Error("Invalid rate limiter configuration.");
  }
  
  return async (req, res, next) => {
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    const normalizedIp = ip.replace(/^::ffff:/, "");
    const key = `${options.scope}:ip:${normalizedIp}`;
    try {
      const result = (await redis.eval(
        RATE_LIMIT_SCRIPT,
        1,
        key,
        String(windowMs),
      )) as [number, number];

      const [currentCount, ttl] = result;
      const remaining = Math.max(0, maxRequests - currentCount);

      res.setHeader("X-RateLimit-Limit", maxRequests);
      res.setHeader("X-RateLimit-Remaining", remaining);
      res.setHeader("X-RateLimit-Reset", Math.ceil((Date.now() + ttl) / 1000));

      if (currentCount > maxRequests) {
        res.setHeader("Retry-After", Math.max(1, Math.ceil(ttl / 1000)));

        sendGatewayError(
          res,
          ErrorCode.RATE_LIMIT_EXCEEDED,
          res.locals.requestId ?? "unknown",
          options.message,
        );

        return;
      }

      next();
    } catch (error) {
      console.error("[Rate Limiter] Redis operation failed:", {
        requestId: res.locals.requestId ?? "unknown",
        scope: options.scope,
        message: error instanceof Error ? error.message : "Unknown error",
      });
      // Fail closed: don't bypass rate limiting when Redis is unavailable.
      sendGatewayError(
        res,
        ErrorCode.RATE_LIMITER_UNAVAILABLE,
        res.locals.requestId ?? "unknown",
      );

      return;
    }
  };
}
