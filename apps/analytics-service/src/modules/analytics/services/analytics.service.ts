import { z } from "zod";

import {
  getClickOverview,
  getDailyClicks,
  getReferrerStats,
  getUserDashboardOverview,
} from "../repositories/analytics.repository";

import { dashboardOverviewQuerySchema } from "../validators/dashboard.validator";
import { resolveDateRange } from "../../../utils/date-range";

const shortCodeSchema = z
  .string()
  .regex(/^[0-9A-Za-z]{10}$/, "Invalid short code.");

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must use YYYY-MM-DD format.")
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);

    return (
      !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
    );
  }, "Invalid calendar date.");

const dateRangeFields = {
  from: dateSchema.optional(),
  to: dateSchema.optional(),
};

const dateRangeSchema = z
  .object(dateRangeFields)
  .superRefine((value, context) => {
    if (value.from && value.to && value.from > value.to) {
      context.addIssue({
        code: "custom",
        path: ["from"],
        message: "Start date must be before or equal to end date.",
      });
    }
  });

const paginationFields = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
};

const dailyClicksQuerySchema = z
  .object({
    ...dateRangeFields,
    ...paginationFields,
    order: z.enum(["asc", "desc"]).default("desc"),
  })
  .superRefine((value, context) => {
    if (value.from && value.to && value.from > value.to) {
      context.addIssue({
        code: "custom",
        path: ["from"],
        message: "Start date must be before or equal to end date.",
      });
    }
  });

const referrerStatsQuerySchema = z
  .object({
    ...dateRangeFields,
    ...paginationFields,
    search: z.string().trim().max(255).optional(),
    sortBy: z.enum(["clicks", "referrer"]).default("clicks"),
    order: z.enum(["asc", "desc"]).default("desc"),
  })
  .superRefine((value, context) => {
    if (value.from && value.to && value.from > value.to) {
      context.addIssue({
        code: "custom",
        path: ["from"],
        message: "Start date must be before or equal to end date.",
      });
    }
  });

export async function getAnalyticsOverview(shortCode: string) {
  const validatedShortCode = shortCodeSchema.parse(shortCode);

  return getClickOverview(validatedShortCode);
}

export async function getDailyClickAnalytics(
  shortCode: string,
  query: unknown,
) {
  const validatedShortCode = shortCodeSchema.parse(shortCode);
  const filters = dailyClicksQuerySchema.parse(query);

  return getDailyClicks(validatedShortCode, filters);
}

export async function getReferrerAnalytics(shortCode: string, query: unknown) {
  const validatedShortCode = shortCodeSchema.parse(shortCode);
  const filters = referrerStatsQuerySchema.parse(query);

  return getReferrerStats(validatedShortCode, filters);
}
export async function getUserDashboardAnalytics(
  userId: string,
  query: unknown,
) {
  const validatedQuery = dashboardOverviewQuerySchema.parse(query);

  const dateRange = resolveDateRange(validatedQuery);

  const overview = await getUserDashboardOverview({
    userId,
    fromUtc: dateRange.fromUtc,
    toUtcExclusive: dateRange.toUtcExclusive,
  });

  return {
    data: overview,
    meta: {
      dateRange: {
        from: dateRange.from,
        to: dateRange.to,
        timezone: dateRange.timezone,
      },
    },
  };
}
