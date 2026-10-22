import { z } from "zod";
export const notificationId = z.string().regex(/^[a-f\d]{24}$/i);
export const notificationQuery = z
  .object({
    unread: z.enum(["true", "false"]).default("false"),
    limit: z.coerce.number().int().min(1).max(50).default(25),
    cursor: z
      .string()
      .regex(/^\d{1,16}:[a-f\d]{24}$/i)
      .refine(
        (v) => Number.isFinite(new Date(Number(v.split(":")[0])).getTime()),
        "Invalid cursor.",
      )
      .optional(),
  })
  .strict();
export const notificationRead = z.object({}).strict();
export type NotificationQuery = z.infer<typeof notificationQuery>;
