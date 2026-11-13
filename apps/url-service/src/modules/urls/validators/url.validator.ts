
import { z } from "zod";

export const createUrlSchema = z.object({
  originalUrl: z
    .string()
    .trim()
    .url()
    .max(2048)
    .refine(
      (value) => ["http:", "https:"].includes(new URL(value).protocol),
      "Only HTTP and HTTPS URLs are allowed"
    ),

  expiresAt: z
    .string()
    .datetime({ offset: true })
    .nullable()
    .optional()
}).strict().refine(
  (data) =>
    !data.expiresAt || new Date(data.expiresAt).getTime() > Date.now(),
  {
    message: "Expiry date must be in the future",
    path: ["expiresAt"]
  }
);

export type CreateUrlInput = z.infer<typeof createUrlSchema>;
