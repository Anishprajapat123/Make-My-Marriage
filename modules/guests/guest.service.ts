import "server-only";
import type { z } from "zod";
import { AccessError, type TenantContext } from "@/lib/tenant/context";
import { guestRepository as repo } from "./guest.repository";
import {
  guestInputSchema,
  familyInputSchema,
  guestIdSchema,
  guestQuerySchema,
  familyQuerySchema,
  guestRevisionSchema,
  guestRestoreSchema,
  guestPatchSchema,
  familyPatchSchema,
} from "./guest.schema";
function parsed<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success)
    throw new AccessError(
      400,
      "VALIDATION_ERROR",
      result.error.issues.map((i) => i.message).join(" "),
    );
  return result.data;
}
function permission(ctx: TenantContext, write = false) {
  if (
    !(write
      ? ctx.permissions.includes("MANAGE_GUESTS")
      : ctx.permissions.some((p) =>
          ["VIEW_GUESTS", "MANAGE_GUESTS"].includes(p),
        ))
  )
    throw new AccessError(403, "FORBIDDEN", "Guest access is restricted.");
}
export function listGuests(ctx: TenantContext, query: unknown) {
  permission(ctx);
  return repo.list(ctx.tenantId, parsed(guestQuerySchema, query));
}
export function getGuest(ctx: TenantContext, id: string) {
  permission(ctx);
  return repo.get(ctx.tenantId, parsed(guestIdSchema, id));
}
export function listFamilies(ctx: TenantContext, query: unknown) {
  permission(ctx);
  return repo.families(ctx.tenantId, parsed(familyQuerySchema, query));
}
export async function saveGuest(
  ctx: TenantContext,
  input: unknown,
  id?: string,
) {
  permission(ctx, true);
  if (id) {
    id = parsed(guestIdSchema, id);
    const patch = parsed(guestPatchSchema, input);
    const current = await repo.get(ctx.tenantId, id);
    const {
      name,
      phone,
      email,
      familyId,
      relationship,
      side,
      guestType,
      notes,
    } = current;
    return repo.save(
      ctx,
      parsed(guestInputSchema, {
        name,
        phone,
        email,
        familyId,
        relationship,
        side,
        guestType,
        notes,
        ...patch,
      }),
      id,
    );
  }
  return repo.save(ctx, parsed(guestInputSchema, input));
}
export function changeGuestStatus(
  ctx: TenantContext,
  id: string,
  input: unknown,
  restore = false,
) {
  permission(ctx, true);
  const p = parsed(restore ? guestRestoreSchema : guestRevisionSchema, input);
  return repo.status(
    ctx,
    parsed(guestIdSchema, id),
    p.revision,
    restore ? "ACTIVE" : "ARCHIVED",
  );
}
export async function saveFamily(
  ctx: TenantContext,
  input: unknown,
  id?: string,
) {
  permission(ctx, true);
  if (id) {
    id = parsed(guestIdSchema, id);
    const patch = parsed(familyPatchSchema, input);
    const current = await repo.family(ctx.tenantId, id);
    const { name, side, notes } = current;
    return repo.saveFamily(
      ctx,
      parsed(familyInputSchema, {
        name,
        side,
        notes,
        primaryContactGuestId: current.primaryContactGuestId
          ? String(current.primaryContactGuestId)
          : null,
        ...patch,
      }),
      id,
    );
  }
  return repo.saveFamily(ctx, parsed(familyInputSchema, input));
}
export function removeFamily(ctx: TenantContext, id: string, input: unknown) {
  permission(ctx, true);
  return repo.removeFamily(
    ctx,
    parsed(guestIdSchema, id),
    parsed(guestRevisionSchema, input).revision,
  );
}
