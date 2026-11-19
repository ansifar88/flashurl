
import type { RequestHandler } from "express";

const CLIENT_IDENTITY_HEADERS = [
  "x-user-id",
  "x-authenticated-user-id",
  "x-user-role",
  "x-user-roles",
  "x-internal-user-id",
  "x-internal-user-role",
];

export const stripIdentityHeaders: RequestHandler = (
  req,
  _res,
  next,
) => {
  for (const header of CLIENT_IDENTITY_HEADERS) {
    delete req.headers[header];
  }

  next();
};
