import { z } from "zod";
import { GUEST_SIDES, GUEST_TYPES } from "./guest.types";
export const guestIdSchema = z
  .string()
  .regex(/^[a-f\d]{24}$/i, "Invalid reference.")
  .transform((v) => v.toLowerCase());
const optionalText = (max: number) => z.string().trim().max(max).default("");
const personOrFamilyName = z
  .string()
  .trim()
  .min(1, "Enter a name.")
  .max(180)
  .refine(
    (v) => /[\p{L}\p{N}]/u.test(v),
    "Include at least one letter or number in the name.",
  );
const phone = z
  .string()
  .trim()
  .max(40)
  .transform((v) => v.replace(/[\s().-]/g, ""))
  .refine(
    (v) => !v || /^\+[1-9]\d{6,14}$/.test(v),
    "Use an international phone number including + and country code.",
  )
  .transform((v) => v || null)
  .nullable()
  .default(null);
const email = z
  .string()
  .trim()
  .toLowerCase()
  .max(254)
  .refine((v) => !v || z.email().safeParse(v).success, "Enter a valid email.")
  .transform((v) => v || null)
  .nullable()
  .default(null);
export const guestInputSchema = z
  .object({
    name: personOrFamilyName,
    phone,
    email,
    familyId: guestIdSchema.nullable().default(null),
    relationship: optionalText(120),
    side: z.enum(GUEST_SIDES).default("OTHER"),
    guestType: z.enum(GUEST_TYPES).default("PRIMARY"),
    notes: optionalText(2000),
    revision: z.number().int().min(0).optional(),
    duplicateConfirmation: z
      .string()
      .regex(/^[a-f\d]{64}$/)
      .optional(),
  })
  .strict();
export const familyInputSchema = z
  .object({
    name: personOrFamilyName,
    side: z.enum(GUEST_SIDES).default("OTHER"),
    notes: optionalText(2000),
    primaryContactGuestId: guestIdSchema.nullable().default(null),
    revision: z.number().int().min(0).optional(),
  })
  .strict();
// PATCH schemas have no defaults: omitted fields must remain unchanged.
export const guestPatchSchema = z
  .object({
    name: guestInputSchema.shape.name.optional(),
    phone: phone.removeDefault().optional(),
    email: email.removeDefault().optional(),
    familyId: guestIdSchema.nullable().optional(),
    relationship: z.string().trim().max(120).optional(),
    side: z.enum(GUEST_SIDES).optional(),
    guestType: z.enum(GUEST_TYPES).optional(),
    notes: z.string().trim().max(2000).optional(),
    revision: z.number().int().min(0),
    duplicateConfirmation: guestInputSchema.shape.duplicateConfirmation,
  })
  .strict()
  .refine(
    (v) =>
      Object.keys(v).some(
        (k) => k !== "revision" && k !== "duplicateConfirmation",
      ),
    "No changes supplied.",
  );
export const familyPatchSchema = z
  .object({
    name: familyInputSchema.shape.name.optional(),
    side: z.enum(GUEST_SIDES).optional(),
    notes: z.string().trim().max(2000).optional(),
    primaryContactGuestId: guestIdSchema.nullable().optional(),
    revision: z.number().int().min(0),
  })
  .strict()
  .refine(
    (v) => Object.keys(v).some((k) => k !== "revision"),
    "No changes supplied.",
  );
export const guestRevisionSchema = z
  .object({ revision: z.number().int().min(0) })
  .strict();
export const guestRestoreSchema = z
  .object({ revision: z.number().int().min(0), action: z.literal("RESTORE") })
  .strict();
const paging = {
  page: z.coerce.number().int().min(1).max(10000).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(25),
};
export const guestQuerySchema = z
  .object({
    ...paging,
    search: optionalText(180),
    familyId: z.union([guestIdSchema, z.literal("UNGROUPED")]).optional(),
    status: z.enum(["ACTIVE", "ARCHIVED", "ALL"]).default("ACTIVE"),
    side: z.enum(GUEST_SIDES).optional(),
    relationship: optionalText(120),
    sortBy: z.enum(["name", "createdAt"]).default("name"),
    sortOrder: z.enum(["asc", "desc"]).default("asc"),
  })
  .strict();
export const familyQuerySchema = z
  .object({ ...paging, search: optionalText(180) })
  .strict();
export type GuestInput = z.infer<typeof guestInputSchema>;
export type GuestQuery = z.infer<typeof guestQuerySchema>;
export type FamilyInput = z.infer<typeof familyInputSchema>;
