
import { randomUUID } from "node:crypto";
import type { RequestHandler } from "express";

const REQUEST_ID_HEADER = "x-request-id";
const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/;

export const requestIdMiddleware: RequestHandler = (
  req,
  res,
  next,
) => {
  const incomingRequestId = req.get(REQUEST_ID_HEADER);

  const requestId =
    incomingRequestId && REQUEST_ID_PATTERN.test(incomingRequestId)
      ? incomingRequestId
      : `req_${randomUUID()}`;

  req.headers[REQUEST_ID_HEADER] = requestId;
  res.locals.requestId = requestId;

  res.setHeader(REQUEST_ID_HEADER, requestId);

  next();
};
