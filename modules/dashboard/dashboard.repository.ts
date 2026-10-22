import "server-only";
import { EventModel } from "@/modules/events/event.model";
import { GuestModel, GuestFamilyModel } from "@/modules/guests/guest.model";
import { VendorModel } from "@/modules/vendors/vendor.model";
import { permitVendors } from "@/modules/vendors/vendor.access";
import { AccessError, type TenantContext } from "@/lib/tenant/context";
export async function upcomingEvents(ctx: TenantContext) {
  if (!ctx.permissions.includes("VIEW_EVENTS"))
    throw new AccessError(403, "FORBIDDEN", "Event access is required.");
  const rows = await EventModel.find({
    tenantId: ctx.tenantId,
    status: "PUBLISHED",
    startAt: { $gte: new Date() },
  })
    .select("name startAt venue.name")
    .sort({ startAt: 1, _id: 1 })
    .limit(3)
    .lean();
  return rows.map((r) => ({
    id: String(r._id),
    name: String(r.name),
    startAt: r.startAt.toISOString(),
    venue: String(r.venue?.name ?? ""),
  }));
}
export async function guestCounts(ctx: TenantContext) {
  if (
    !ctx.permissions.some((p) => ["VIEW_GUESTS", "MANAGE_GUESTS"].includes(p))
  )
    throw new AccessError(403, "FORBIDDEN", "Guest access is required.");
  const [total, families] = await Promise.all([
    GuestModel.countDocuments({ tenantId: ctx.tenantId, status: "ACTIVE" }),
    GuestFamilyModel.countDocuments({ tenantId: ctx.tenantId }),
  ]);
  return { total, families };
}
export async function vendorCount(ctx: TenantContext) {
  permitVendors(ctx);
  return {
    active: await VendorModel.countDocuments({
      tenantId: ctx.tenantId,
      status: "ACTIVE",
    }),
  };
}
