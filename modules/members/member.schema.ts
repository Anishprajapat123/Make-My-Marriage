import { z } from "zod";
export const memberIdSchema = z.string().regex(/^[a-f\d]{24}$/i);
const roleIds = z
  .array(memberIdSchema)
  .min(1)
  .max(10)
  .refine((ids) => new Set(ids).size === ids.length, "Choose each role once.");
export const inviteMemberSchema = z
  .object({ email: z.string().trim().toLowerCase().email().max(254), roleIds })
  .strict();
export const editMemberSchema = z
  .object({
    roleIds: roleIds.optional(),
    status: z.enum(["ACTIVE", "SUSPENDED", "REMOVED"]).optional(),
    updatedAt: z.iso.datetime(),
  })
  .strict()
  .refine(
    (v) => v.roleIds !== undefined || v.status !== undefined,
    "No changes supplied.",
  );
export const memberQuerySchema = z
  .object({
    q: z.string().trim().max(160).default(""),
    roleId: memberIdSchema.optional(),
    status: z.enum(["ACTIVE", "SUSPENDED", "REMOVED"]).optional(),
    page: z.coerce.number().int().min(1).max(10000).default(1),
  })
  .strict();
export const invitationActionSchema = z
  .object({
    action: z.enum(["REVOKE", "REPLACE"]),
    updatedAt: z.iso.datetime(),
  })
  .strict();
