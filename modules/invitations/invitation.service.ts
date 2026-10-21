import "server-only";
import type { z } from "zod";
import { AccessError, type TenantContext } from "@/lib/tenant/context";
import {
  invitationConfigSchema,
  guestLinkSchema,
  invitationQuerySchema,
  publicRsvpSchema,
} from "./invitation.schema";
import {
  invitationConfig,
  saveInvitation,
  issueGuestLink,
  invitationRows,
} from "./invitation.repository";
import { submitRsvp } from "@/modules/rsvp/rsvp.repository";
function parse<T>(schema: z.ZodType<T>, input: unknown): T {
  const r = schema.safeParse(input);
  if (!r.success)
    throw new AccessError(
      400,
      "VALIDATION_ERROR",
      r.error.issues.map((i) => i.message).join(" "),
    );
  return r.data;
}
export const getInvitationConfig = (ctx: TenantContext) =>
  invitationConfig(ctx.tenantId);
export const configureInvitation = (ctx: TenantContext, input: unknown) =>
  saveInvitation(ctx, parse(invitationConfigSchema, input));
export const generateGuestLink = (ctx: TenantContext, input: unknown) =>
  issueGuestLink(ctx, parse(guestLinkSchema, input));
export const listInvitationStatus = (ctx: TenantContext, input: unknown) =>
  invitationRows(ctx, parse(invitationQuerySchema, input));
export const savePublicRsvp = (token: string, input: unknown) =>
  submitRsvp(token, parse(publicRsvpSchema, input));
