
import { AppError, ErrorCode } from "@flashurl/errors";
import { redis } from "../../../infrastructure/redis/connection";
import {
  fetchUrlMetadata,
  type UrlMetadata,
} from "../../../infrastructure/url-client/url.client";

const CACHE_PREFIX = "flashurl:redirect:";
const DEFAULT_CACHE_TTL_SECONDS = 3600;
const MAX_CACHE_TTL_SECONDS = 86400;

function isValidCachedUrl(value: unknown): value is UrlMetadata {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const data = value as Record<string, unknown>;

  if (
    typeof data.id !== "string" ||
    typeof data.shortCode !== "string" ||
    typeof data.originalUrl !== "string" ||
    typeof data.isActive !== "boolean"
  ) {
    return false;
  }

  if (
    data.expiresAt !== null &&
    typeof data.expiresAt !== "string"
  ) {
    return false;
  }

  if (
    typeof data.expiresAt === "string" &&
    !Number.isFinite(Date.parse(data.expiresAt))
  ) {
    return false;
  }

  try {
    const parsedUrl = new URL(data.originalUrl);

    return (
      parsedUrl.protocol === "http:" ||
      parsedUrl.protocol === "https:"
    );
  } catch {
    return false;
  }
}

function validateUrl(url: UrlMetadata): void {
  if (!url.isActive) {
    throw new AppError(ErrorCode.URL_INACTIVE);
  }

  if (
    url.expiresAt &&
    new Date(url.expiresAt).getTime() <= Date.now()
  ) {
    throw new AppError(ErrorCode.URL_EXPIRED);
  }
}

function calculateCacheTtl(url: UrlMetadata): number {
  if (!url.expiresAt) {
    return DEFAULT_CACHE_TTL_SECONDS;
  }

  const remainingSeconds = Math.floor(
    (new Date(url.expiresAt).getTime() - Date.now()) / 1000,
  );

  if (remainingSeconds <= 0) {
    return 0;
  }

  return Math.min(
    remainingSeconds,
    MAX_CACHE_TTL_SECONDS,
  );
}


export async function resolveShortCode(
  shortCode: string,
): Promise<UrlMetadata> {
  const cacheKey = `${CACHE_PREFIX}${shortCode}`;

  // 1. Try Redis.
  let cachedValue: string | null = null;

  try {
    cachedValue = await redis.get(cacheKey);
  } catch (error) {
    console.error(
      "[Redirect] Redis lookup failed. Falling back to URL Service:",
      error instanceof Error ? error.message : error,
    );
  }

  // 2. Validate cache entry.
  if (cachedValue !== null) {
    let cachedUrl: unknown;

    try {
      cachedUrl = JSON.parse(cachedValue);
    } catch {
      cachedUrl = null;
    }

    if (isValidCachedUrl(cachedUrl)) {
      validateUrl(cachedUrl);
      return cachedUrl;
    }

    // Corrupted cache entry: remove it and fetch authoritative data.
    try {
      await redis.del(cacheKey);
    } catch (error) {
      console.error(
        "[Redirect] Failed to remove invalid cache entry:",
        error instanceof Error ? error.message : error,
      );
    }
  }

  // 3. Cache miss or Redis failure: fetch from URL Service.
  const url = await fetchUrlMetadata(shortCode);

  validateUrl(url);

  // 4. Cache valid metadata.
  const ttl = calculateCacheTtl(url);

  if (ttl > 0) {
    try {
      await redis.set(
        cacheKey,
        JSON.stringify(url),
        "EX",
        ttl,
      );
    } catch (error) {
      console.error(
        "[Redirect] Redis cache write failed:",
        error instanceof Error ? error.message : error,
      );
    }
  }

  return url;
}
