import type { Request, Response, NextFunction } from "express";

import {
  createSuccessResponse,
  createPaginatedResponse,
} from "@flashurl/contracts";

import { AppError, ErrorCode } from "@flashurl/errors";

import { verifyAnalyticsUrlOwnership } from "../services/url-ownership.service";

import {
  getAnalyticsOverview,
  getDailyClickAnalytics,
  getReferrerAnalytics,
  getUserDashboardAnalytics
} from "../services/analytics.service";

function getShortCode(req: Request): string {
  const shortCode = req.params.shortCode;

  if (typeof shortCode !== "string" || !/^[0-9A-Za-z]{10}$/.test(shortCode)) {
    throw new AppError(ErrorCode.INVALID_SHORT_CODE);
  }

  return shortCode;
}

async function authorizeAnalyticsAccess(
  req: Request,
  res: Response,
): Promise<string> {
  const shortCode = getShortCode(req);
  const accessToken = res.locals.accessToken;

  if (typeof accessToken !== "string" || !accessToken) {
    throw new AppError(ErrorCode.UNAUTHORIZED);
  }

  await verifyAnalyticsUrlOwnership(shortCode, accessToken);

  return shortCode;
}

export async function getOverview(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const shortCode = await authorizeAnalyticsAccess(req, res);
    const data = await getAnalyticsOverview(shortCode);

    res
      .status(200)
      .json(
        createSuccessResponse(
          "Analytics overview retrieved successfully",
          data,
        ),
      );
  } catch (error) {
    next(error);
  }
}

export async function getDailyClicks(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const shortCode = await authorizeAnalyticsAccess(req, res);
    const result = await getDailyClickAnalytics(shortCode, req.query);

    res
      .status(200)
      .json(
        createPaginatedResponse(
          "Daily click analytics retrieved successfully",
          result.data,
          result.pagination,
        ),
      );
  } catch (error) {
    next(error);
  }
}

export async function getReferrerStats(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const shortCode = await authorizeAnalyticsAccess(req, res);
    const result = await getReferrerAnalytics(shortCode, req.query);

    res
      .status(200)
      .json(
        createPaginatedResponse(
          "Referrer analytics retrieved successfully",
          result.data,
          result.pagination,
        ),
      );
  } catch (error) {
    next(error);
  }
}

export async function getDashboardOverview(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = res.locals.userId;

    if (typeof userId !== "string" || !userId) {
      throw new AppError(ErrorCode.UNAUTHORIZED);
    }

    const result = await getUserDashboardAnalytics(userId, req.query);

    res.status(200).json(
      createSuccessResponse(
        "Dashboard overview retrieved successfully",
        result.data,
        result.meta,
      ),
    );
  } catch (error) {
    next(error);
  }
}