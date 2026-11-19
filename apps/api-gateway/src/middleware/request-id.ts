import { randomUUID } from "node:crypto";
import type { RequestHandler } from "express";

const REQUEST_ID_HEADER = "x-request-id";

const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/;

export const requestIdMiddleware: RequestHandler = (req, res, next) => {
  const incomingRequestId = req.get(REQUEST_ID_HEADER);

  const requestId =
    incomingRequestId && REQUEST_ID_PATTERN.test(incomingRequestId)
      ? incomingRequestId
      : `req_${randomUUID()}`;

  // Forward the same ID to downstream services.
  req.headers[REQUEST_ID_HEADER] = requestId;
  // Make it available to controllers and error handlers.
  res.locals.requestId = requestId;
  // Include the ID in the gateway response.
  res.setHeader(REQUEST_ID_HEADER, requestId);

  next();
};
