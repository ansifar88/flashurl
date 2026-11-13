export const ErrorCode = {
  // Common
  INTERNAL_SERVER_ERROR: "INTERNAL_SERVER_ERROR",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  RATE_LIMIT_EXCEEDED: "RATE_LIMIT_EXCEEDED",
  API_ROUTE_NOT_FOUND: "API_ROUTE_NOT_FOUND",

  // URL Service
  URL_NOT_FOUND: "URL_NOT_FOUND",
  URL_EXPIRED: "URL_EXPIRED",
  URL_INACTIVE: "URL_INACTIVE",
  INVALID_SHORT_CODE: "INVALID_SHORT_CODE",

  // Redirect Service
  URL_SERVICE_UNAVAILABLE: "URL_SERVICE_UNAVAILABLE",
  URL_SERVICE_TIMEOUT: "URL_SERVICE_TIMEOUT",
  URL_SERVICE_INVALID_RESPONSE: "URL_SERVICE_INVALID_RESPONSE",

  // User Service
  USER_NOT_FOUND: "USER_NOT_FOUND",
  INVALID_CREDENTIALS: "INVALID_CREDENTIALS",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",

  SHORT_CODE_GENERATION_FAILED: "SHORT_CODE_GENERATION_FAILED",
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

export const ERROR_DEFINITIONS: Record<
  ErrorCode,
  { message: string; statusCode: number }
> = {
  INTERNAL_SERVER_ERROR: {
    message: "An unexpected error occurred",
    statusCode: 500,
  },
  VALIDATION_ERROR: {
    message: "Request validation failed",
    statusCode: 400,
  },
  RATE_LIMIT_EXCEEDED: {
    message: "Too many requests",
    statusCode: 429,
  },
  API_ROUTE_NOT_FOUND: {
    message: "API route not found",
    statusCode: 404,
  },
  URL_NOT_FOUND: {
    message: "Short URL not found",
    statusCode: 404,
  },
  URL_EXPIRED: {
    message: "Short URL has expired",
    statusCode: 410,
  },
  URL_INACTIVE: {
    message: "Short URL is inactive",
    statusCode: 410,
  },
  INVALID_SHORT_CODE: {
    message: "Invalid short code",
    statusCode: 400,
  },
  USER_NOT_FOUND: {
    message: "User not found",
    statusCode: 404,
  },
  INVALID_CREDENTIALS: {
    message: "Invalid email or password",
    statusCode: 401,
  },
  UNAUTHORIZED: {
    message: "Authentication required",
    statusCode: 401,
  },
  FORBIDDEN: {
    message: "You do not have permission to perform this action",
    statusCode: 403,
  },
  SHORT_CODE_GENERATION_FAILED: {
    message: "Unable to generate a unique short code",
    statusCode: 500,
  },
  URL_SERVICE_UNAVAILABLE: {
    message: "URL Service is temporarily unavailable",
    statusCode: 503,
  },
  URL_SERVICE_TIMEOUT: {
    message: "URL Service request timed out",
    statusCode: 504,
  },
  URL_SERVICE_INVALID_RESPONSE: {
    message: "Invalid response from URL Service",
    statusCode: 502,
  },
};
