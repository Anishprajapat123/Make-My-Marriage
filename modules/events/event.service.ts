import "server-only";

import type { TenantContext } from "@/lib/tenant/context";
import { AccessError } from "@/lib/tenant/context";
import { eventInputSchema, timelineInputSchema } from "./event.schema";
import { eventRepository } from "./event.repository";

import { localToUtc } from "./event.time";
import type { EventView } from "./event.types";

function permitted(ctx: TenantContext, write = false) {
  if (!ctx.permissions.includes(write ? "MANAGE_EVENTS" : "VIEW_EVENTS"))
    throw new AccessError(
      403,
      "FORBIDDEN",
      "You do not have permission for this action.",
    );
}
function validId(id: string) {
  if (!/^[a-f\d]{24}$/i.test(id))
    throw new AccessError(404, "NOT_FOUND", "Event not found.");
}
function instant(date: string, time: string, timezone: string) {
  try {
    return localToUtc(date, time, timezone);
  } catch (e) {
    throw new AccessError(
      400,
      "VALIDATION_ERROR",
      e instanceof Error ? e.message : "Invalid local time.",
    );
  }
}
function dto(record: Record<string, unknown>): EventView {
  const r = JSON.parse(JSON.stringify(record));
  return {
    id: r._id,
    name: r.name,
    ceremonyType: r.ceremonyType ?? "",
    description: r.description ?? "",
    startAt: r.startAt,
    endAt: r.endAt ?? null,
    status: r.status,
    dressCode: r.dressCode ?? "",
    notes: r.notes ?? "",
    venue: r.venue,
    timelineItems: (r.timelineItems ?? [])
      .map((i: { _id: string; title: string; at: string; note: string }) => ({
        id: i._id,
        title: i.title,
        at: i.at,
        note: i.note ?? "",
      }))
      .sort((a: { at: string }, b: { at: string }) => a.at.localeCompare(b.at)),
    updatedAt: r.updatedAt,
  };
}
export async function listEvents(ctx: TenantContext) {
  permitted(ctx);
  return (await eventRepository.list(ctx.tenantId)).map((r) => dto(r));
}
export async function getEvent(ctx: TenantContext, id: string) {
  permitted(ctx);
  validId(id);
  const r = await eventRepository.get(ctx.tenantId, id);
  if (!r) throw new AccessError(404, "NOT_FOUND", "Event not found.");
  return dto(r);
}
export async function saveEvent(
  ctx: TenantContext,
  input: unknown,
  id?: string,
) {
  permitted(ctx, true);
  if (id) validId(id);
  const parsed = eventInputSchema.safeParse(input);
  if (!parsed.success)
    throw new AccessError(
      400,
      "VALIDATION_ERROR",
      parsed.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join(" "),
    );
  const { date, startTime, endDate, endTime, updatedAt, ...fields } =
    parsed.data;
  const startAt = instant(date, startTime, ctx.timezone);
  const endAt =
    endDate && endTime ? instant(endDate, endTime, ctx.timezone) : null;
  if (endAt && endAt <= startAt)
    throw new AccessError(
      400,
      "VALIDATION_ERROR",
      "End must be later than start.",
    );
  if (id && !updatedAt)
    throw new AccessError(
      400,
      "VALIDATION_ERROR",
      "The event version is required. Reload and try again.",
    );
  const r = id
    ? await eventRepository.update(ctx.tenantId, id, updatedAt!, {
        ...fields,
        startAt,
        endAt,
      })
    : await eventRepository.create(ctx.tenantId, ctx.memberId, {
        ...fields,
        startAt,
        endAt,
      });
  if (!r)
    throw new AccessError(
      409,
      "CONFLICT",
      "This event changed or was deleted. Reload before editing.",
    );
  return dto(typeof r.toObject === "function" ? r.toObject() : r);
}
export async function saveTimelineItem(
  ctx: TenantContext,
  id: string,
  input: unknown,
  itemId?: string,
) {
  permitted(ctx, true);
  validId(id);
  if (itemId) validId(itemId);
  const p = timelineInputSchema.safeParse(input);
  if (!p.success)
    throw new AccessError(
      400,
      "VALIDATION_ERROR",
      "Enter a title, valid date/time, and the current event version.",
    );
  const { title, date, time, note, updatedAt } = p.data;
  const at = instant(date, time, ctx.timezone);
  const r = await eventRepository.saveTimeline(
    ctx.tenantId,
    id,
    updatedAt,
    { title, at, note },
    itemId,
  );
  if (!r)
    throw new AccessError(
      409,
      "CONFLICT",
      "The event changed, the item was removed, or the 100-item limit was reached. Reload and try again.",
    );
  return dto(r);
}
export async function deleteTimelineItem(
  ctx: TenantContext,
  id: string,
  itemId: string,
  updatedAt: string,
) {
  permitted(ctx, true);
  validId(id);
  validId(itemId);
  if (!updatedAt || Number.isNaN(Date.parse(updatedAt)))
    throw new AccessError(
      400,
      "VALIDATION_ERROR",
      "The current event version is required.",
    );
  const r = await eventRepository.removeTimeline(
    ctx.tenantId,
    id,
    itemId,
    updatedAt,
  );
  if (!r)
    throw new AccessError(
      409,
      "CONFLICT",
      "This event changed. Reload and try again.",
    );
  return dto(r);
}
export async function deleteEvent(
  ctx: TenantContext,
  id: string,
  updatedAt: string,
) {
  permitted(ctx, true);
  validId(id);
  if (!updatedAt || Number.isNaN(Date.parse(updatedAt)))
    throw new AccessError(
      400,
      "VALIDATION_ERROR",
      "The current event version is required.",
    );
  const outcome = await eventRepository.deleteWithDependencies(
    ctx.tenantId,
    id,
    updatedAt,
  );
  if (outcome === "linked")
    throw new AccessError(
      409,
      "EVENT_HAS_LINKED_RECORDS",
      "This event has linked records. Reassign or remove them before deleting.",
    );
  if (outcome !== "deleted")
    throw new AccessError(
      409,
      "CONFLICT",
      "This event changed or was deleted. Reload and try again.",
    );
}
