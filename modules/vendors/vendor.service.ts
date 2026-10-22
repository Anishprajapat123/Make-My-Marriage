import "server-only";
import { z } from "zod";
import { AccessError, type TenantContext } from "@/lib/tenant/context";
import { permitVendors } from "./vendor.access";
import * as repo from "./vendor.repository";
import {
  vendorQuery,
  vendorId,
  vendorCreate,
  vendorEdit,
  vendorRevision,
} from "./vendor.schema";
function parse<T extends z.ZodType>(schema: T, value: unknown): z.infer<T> {
  const p = schema.safeParse(value);
  if (!p.success)
    throw new AccessError(
      400,
      "VALIDATION_ERROR",
      p.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(" "),
    );
  return p.data;
}
function id(value: string) {
  const p = vendorId.safeParse(value);
  if (!p.success) throw new AccessError(404, "NOT_FOUND", "Vendor not found.");
  return p.data;
}
export function list(ctx: TenantContext, q: unknown) {
  permitVendors(ctx);
  return repo.listVendors(ctx, parse(vendorQuery, q));
}
export function detail(ctx: TenantContext, value: string) {
  permitVendors(ctx);
  return repo.getVendor(ctx, id(value));
}
export function options(ctx: TenantContext) {
  permitVendors(ctx);
  return repo.vendorOptions(ctx);
}
export function create(ctx: TenantContext, input: unknown) {
  permitVendors(ctx, true);
  const p = parse(vendorCreate, input);
  return repo.createVendor(ctx, p.vendor, p.requestId);
}
export function update(ctx: TenantContext, value: string, input: unknown) {
  permitVendors(ctx, true);
  const p = parse(vendorEdit, input);
  return repo.updateVendor(ctx, id(value), p.vendor, p.revision);
}
export function archive(
  ctx: TenantContext,
  value: string,
  input: unknown,
  restore = false,
) {
  permitVendors(ctx, true);
  const p = parse(vendorRevision, input);
  return repo.archiveVendor(ctx, id(value), p.revision, restore);
}
