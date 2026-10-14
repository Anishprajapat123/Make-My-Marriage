import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import mongoose, { Types } from "mongoose";
const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  current: vi.fn(),
  find: vi.fn(),
  findOne: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  deleteOne: vi.fn(),
}));
vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@/modules/wedding/wedding.service", () => ({
  getCurrentWeddingForUser: mocks.current,
}));
vi.mock("@/modules/events/event.model", () => ({
  EventModel: {
    find: mocks.find,
    findOne: mocks.findOne,
    create: mocks.create,
    findOneAndUpdate: mocks.update,
    deleteOne: mocks.deleteOne,
  },
}));
import { requireTenant, type TenantContext } from "@/lib/tenant/context";
import { eventRepository } from "@/modules/events/event.repository";
import {
  getEvent,
  saveEvent,
  deleteEvent,
  saveTimelineItem,
} from "@/modules/events/event.service";
import { readEventBody } from "@/modules/events/event.http";
const tenantId = "111111111111111111111111",
  memberId = "222222222222222222222222",
  eventId = "333333333333333333333333";
const ctx: TenantContext = {
  tenantId,
  memberId,
  timezone: "Asia/Kolkata",
  permissions: ["VIEW_EVENTS"],
  memberName: "Test",
  weddingTitle: "Test wedding",
  roleKeys: ["VIEWER"],
};
beforeEach(() => vi.resetAllMocks());
afterEach(() => vi.restoreAllMocks());
describe("event access boundaries", () => {
  it("blocks linked event deletion and keeps dependency checks in the tenant", async () => {
    const session = {
      withTransaction: vi.fn(async (fn: () => Promise<unknown>) => fn()),
      endSession: vi.fn(),
    };
    vi.spyOn(mongoose, "startSession").mockResolvedValue(session as never);
    const findOne = vi.fn().mockResolvedValue({ _id: memberId });
    vi.spyOn(mongoose.connection, "collection").mockReturnValue({
      findOne,
    } as never);
    await expect(
      deleteEvent(
        { ...ctx, permissions: ["MANAGE_EVENTS"] },
        eventId,
        "2026-10-14T00:00:00.000Z",
      ),
    ).rejects.toMatchObject({ code: "EVENT_HAS_LINKED_RECORDS" });
    expect(findOne.mock.calls[0][0].tenantId).toEqual(
      new Types.ObjectId(tenantId),
    );
    expect(mocks.deleteOne).not.toHaveBeenCalled();
    expect(session.endSession).toHaveBeenCalled();
  });
  it("atomically applies tenant, version, and timeline bounds to additions", async () => {
    mocks.update.mockReturnValue({ lean: () => Promise.resolve(null) });
    await expect(
      saveTimelineItem({ ...ctx, permissions: ["MANAGE_EVENTS"] }, eventId, {
        title: "Soundcheck",
        date: "2026-11-26",
        time: "17:00",
        note: "",
        updatedAt: "2026-10-14T00:00:00.000Z",
      }),
    ).rejects.toMatchObject({ status: 409 });
    expect(mocks.update.mock.calls[0][0]).toEqual({
      tenantId: new Types.ObjectId(tenantId),
      _id: new Types.ObjectId(eventId),
      updatedAt: new Date("2026-10-14T00:00:00.000Z"),
      "timelineItems.99": { $exists: false },
    });
  });
  it("rejects an unauthenticated request", async () => {
    mocks.auth.mockResolvedValue(null);
    await expect(requireTenant("VIEW_EVENTS")).rejects.toMatchObject({
      status: 401,
    });
    expect(mocks.current).not.toHaveBeenCalled();
  });
  it("rejects suspended membership and insufficient permissions", async () => {
    mocks.auth.mockResolvedValue({ user: { id: memberId } });
    mocks.current.mockResolvedValue({
      membership: { membershipStatus: "SUSPENDED" },
      wedding: null,
      effectivePermissions: [],
    });
    await expect(requireTenant("VIEW_EVENTS")).rejects.toMatchObject({
      status: 403,
    });
    mocks.current.mockResolvedValue({
      membership: { membershipStatus: "ACTIVE" },
      wedding: { timezone: "UTC" },
      effectivePermissions: [],
    });
    await expect(requireTenant("MANAGE_EVENTS")).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });
  it("scopes event reads to both tenant and resource", async () => {
    mocks.findOne.mockReturnValue({ lean: () => Promise.resolve(null) });
    await eventRepository.get(tenantId, eventId);
    expect(mocks.findOne).toHaveBeenCalledWith({
      tenantId: new Types.ObjectId(tenantId),
      _id: new Types.ObjectId(eventId),
    });
    await expect(getEvent(ctx, eventId)).rejects.toMatchObject({ status: 404 });
  });
  it("blocks read-only mutations before accessing persistence", async () => {
    await expect(saveEvent(ctx, {}, eventId)).rejects.toMatchObject({
      status: 403,
    });
    await expect(
      deleteEvent(ctx, eventId, "2026-10-14T00:00:00.000Z"),
    ).rejects.toMatchObject({ status: 403 });
    await expect(saveTimelineItem(ctx, eventId, {})).rejects.toMatchObject({
      status: 403,
    });
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it("scopes updates and rejects stale versions", async () => {
    mocks.update.mockReturnValue({ lean: () => Promise.resolve(null) });
    const manager = { ...ctx, permissions: ["VIEW_EVENTS", "MANAGE_EVENTS"] };
    await expect(
      saveEvent(
        manager,
        {
          name: "Sangeet",
          date: "2026-11-26",
          startTime: "19:30",
          status: "DRAFT",
          venue: { name: "Hall", addressLine1: "Road", city: "Jaipur" },
          updatedAt: "2026-10-14T00:00:00.000Z",
        },
        eventId,
      ),
    ).rejects.toMatchObject({ status: 409 });
    expect(mocks.update.mock.calls[0][0]).toEqual({
      tenantId: new Types.ObjectId(tenantId),
      _id: new Types.ObjectId(eventId),
      updatedAt: new Date("2026-10-14T00:00:00.000Z"),
    });
  });
  it("rejects simple cross-site bodies and foreign JSON origins", async () => {
    await expect(
      readEventBody(
        new Request("http://localhost:3000/api/v1/events", {
          method: "POST",
          headers: { "content-type": "text/plain" },
          body: "{}",
        }),
      ),
    ).rejects.toMatchObject({ status: 415 });
    await expect(
      readEventBody(
        new Request("http://localhost:3000/api/v1/events", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            origin: "https://foreign.example",
          },
          body: "{}",
        }),
      ),
    ).rejects.toMatchObject({ status: 403 });
  });
});
