import { z } from "zod";

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must use YYYY-MM-DD format.")
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);

    return (
      !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
    );
  }, "Invalid calendar date.");

const timezoneSchema = z
  .string()
  .trim()
  .min(1)
  .max(100)
  .refine((timezone) => {
    try {
      new Intl.DateTimeFormat("en-US", {
        timeZone: timezone,
      });

      return true;
    } catch {
      return false;
    }
  }, "Invalid IANA timezone.");

export const dashboardOverviewQuerySchema = z
  .object({
    from: dateSchema.optional(),
    to: dateSchema.optional(),
    timezone: timezoneSchema.default("UTC"),
  })
  .strict()
  .superRefine((value, context) => {
    if (Boolean(value.from) !== Boolean(value.to)) {
      context.addIssue({
        code: "custom",
        path: ["to"],
        message: "Both from and to dates must be provided together.",
      });
    }

    if (value.from && value.to && value.from > value.to) {
      context.addIssue({
        code: "custom",
        path: ["from"],
        message: "Start date must be before or equal to end date.",
      });
    }
  });

export type DashboardOverviewQuery = z.infer<
  typeof dashboardOverviewQuerySchema
>;
