import { z } from "zod";
import { guestIdSchema } from "@/modules/guests/guest.schema";
export const validGuestToken = (value: string) =>
  /^[A-Za-z0-9_-]{43}$/.test(value);
export const invitationConfigSchema = z
  .object({
    title: z.string().trim().min(1).max(180),
    welcomeMessage: z.string().trim().max(2000),
    story: z.string().trim().max(5000),
    language: z.enum(["en", "hi"]),
    published: z.boolean(),
    revision: z.number().int().min(0).nullable(),
  })
  .strict();
export const guestLinkSchema = z
  .object({
    guestId: guestIdSchema,
    action: z.enum(["ISSUE", "REPLACE", "REVOKE"]),
    revision: z.number().int().min(0).nullable(),
  })
  .strict();
export const invitationQuerySchema = z
  .object({
    search: z.string().trim().max(180).default(""),
    page: z.coerce.number().int().min(1).max(10000).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(25),
    status: z.enum(["ALL", "YES", "NO", "PENDING"]).default("ALL"),
  })
  .strict();
export const publicRsvpSchema = z
  .object({
    attendance: z.enum(["YES", "NO"]),
    revision: z.number().int().min(0),
    requestId: z.uuid(),
    companions: z
      .array(
        z
          .object({
            clientId: z.uuid(),
            name: z
              .string()
              .trim()
              .min(1)
              .max(180)
              .refine(
                (v) => /[\p{L}\p{N}]/u.test(v),
                "Enter a companion name.",
              ),
            guestType: z.enum(["COMPANION", "CHILD"]),
          })
          .strict(),
      )
      .max(10),
    duplicateConfirmation: z
      .string()
      .regex(/^[a-f\d]{64}$/)
      .optional(),
  })
  .strict()
  .refine(
    (v) =>
      new Set(v.companions.map((c) => c.clientId)).size === v.companions.length,
    "Each companion must be listed once.",
  )
  .refine(
    (v) => v.attendance === "YES" || v.companions.length === 0,
    "Declining cannot include attending companions.",
  );
export type RsvpInput = z.infer<typeof publicRsvpSchema>;
