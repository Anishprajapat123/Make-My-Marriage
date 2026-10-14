import { describe, it, expect } from "vitest";
import { localToUtc, localParts } from "@/modules/events/event.time";
import { eventInputSchema } from "@/modules/events/event.schema";
const input = {
  name: "Sangeet",
  date: "2026-11-26",
  startTime: "19:30",
  status: "DRAFT",
  venue: { name: "Ballroom", addressLine1: "Main Street", city: "Jaipur" },
};
describe("wedding event time boundaries", () => {
  it("converts wedding wall time to UTC and back", () => {
    const date = localToUtc("2026-11-26", "19:30", "Asia/Kolkata");
    expect(date.toISOString()).toBe("2026-11-26T14:00:00.000Z");
    expect(localParts(date.toISOString(), "Asia/Kolkata")).toEqual({
      date: "2026-11-26",
      time: "19:30",
    });
  });
  it("preserves an overnight finish", () => {
    expect(
      localToUtc("2026-11-27", "00:30", "Asia/Kolkata").toISOString(),
    ).toBe("2026-11-26T19:00:00.000Z");
    expect(
      eventInputSchema.safeParse({
        ...input,
        endDate: "2026-11-27",
        endTime: "00:30",
      }).success,
    ).toBe(true);
  });
  it("rejects nonexistent and ambiguous daylight-saving times", () => {
    expect(() => localToUtc("2026-03-08", "02:30", "America/New_York")).toThrow(
      "does not exist",
    );
    expect(() => localToUtc("2026-11-01", "01:30", "America/New_York")).toThrow(
      "occurs twice",
    );
  });
  it("allows no end but rejects half-entered ends and reversed ranges", () => {
    expect(eventInputSchema.safeParse(input).success).toBe(true);
    expect(
      eventInputSchema.safeParse({ ...input, endTime: "22:00" }).success,
    ).toBe(false);
    expect(
      eventInputSchema.safeParse({
        ...input,
        endDate: input.date,
        endTime: "18:00",
      }).success,
    ).toBe(false);
  });
  it("rejects tenant injection, unsafe map schemes, and impossible dates", () => {
    expect(
      eventInputSchema.safeParse({ ...input, tenantId: "someone-else" })
        .success,
    ).toBe(false);
    expect(
      eventInputSchema.safeParse({
        ...input,
        venue: { ...input.venue, mapUrl: "javascript:alert(1)" },
      }).success,
    ).toBe(false);
    expect(
      eventInputSchema.safeParse({ ...input, date: "2026-02-30" }).success,
    ).toBe(false);
  });
});
