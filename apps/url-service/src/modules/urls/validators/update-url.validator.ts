
import { z } from "zod";

export const updateUrlSchema = z
  .object({
    originalUrl: z
      .string()
      .trim()
      .url()
      .max(2048)
      .refine(
        (value) => ["http:", "https:"].includes(new URL(value).protocol),
        "Only HTTP and HTTPS URLs are allowed"
      )
      .optional(),

    expiresAt: z
      .string()
      .datetime({ offset: true })
      .nullable()
      .optional()
  })
  .strict()
  .refine(
    (data) =>
      data.originalUrl !== undefined ||
      data.expiresAt !== undefined,
    {
      message: "At least one field must be provided",
    }
  )
  .refine(
    (data) =>
      !data.expiresAt ||
      new Date(data.expiresAt).getTime() > Date.now(),
    {
      message: "Expiry date must be in the future",
      path: ["expiresAt"]
    }
  );

export type UpdateUrlInput = z.infer<typeof updateUrlSchema>;
