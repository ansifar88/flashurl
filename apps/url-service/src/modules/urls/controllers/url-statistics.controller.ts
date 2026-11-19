import type { RequestHandler } from "express";
import { createSuccessResponse } from "@flashurl/contracts";
import { getPlatformUrlStatistics } from "../services/url-statistics.service";

export const handleGetUrlStatistics: RequestHandler = async (
  _req,
  res,
  next,
) => {
  try {
    const statistics = await getPlatformUrlStatistics();

    res
      .status(200)
      .json(
        createSuccessResponse(
          "URL statistics retrieved successfully",
          statistics,
        ),
      );
  } catch (error) {
    next(error);
  }
};
