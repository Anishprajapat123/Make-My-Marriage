import { z } from "zod";
import { EVENT_STATUSES } from "./event.types";
const text = (max: number) => z.string().trim().max(max).default("");
const required = (max: number) => z.string().trim().min(1).max(max);
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
export const eventInputSchema = z
  .object({
    name: required(160),
    ceremonyType: text(80),
    description: text(2000),
    date: z.iso.date(),
    startTime: time,
    endDate: z.union([z.iso.date(), z.literal("")]).default(""),
    endTime: z.union([time, z.literal("")]).default(""),
    status: z.enum(EVENT_STATUSES),
    dressCode: text(300),
    notes: text(2000),
    venue: z
      .object({
        name: required(160),
        addressLine1: required(300),
        city: required(120),
        state: text(120),
        postalCode: text(20),
        mapUrl: text(2048).refine(
          (v) => !v || (/^https?:\/\//i.test(v) && URL.canParse(v)),
          "Enter an http or https URL.",
        ),
        directions: text(1000),
      })
      .strict(),
    updatedAt: z.iso.datetime().optional(),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (Boolean(v.endDate) !== Boolean(v.endTime))
      ctx.addIssue({
        code: "custom",
        path: ["endTime"],
        message: "Enter both an end date and time, or leave both empty.",
      });
    if (
      v.endDate &&
      v.endTime &&
      `${v.endDate}T${v.endTime}` <= `${v.date}T${v.startTime}`
    )
      ctx.addIssue({
        code: "custom",
        path: ["endTime"],
        message: "End must be later than start.",
      });
  });
export const timelineInputSchema = z
  .object({
    title: required(160),
    date: z.iso.date(),
    time,
    note: text(1000),
    updatedAt: z.iso.datetime(),
  })
  .strict();
export type EventInput = z.infer<typeof eventInputSchema>;
