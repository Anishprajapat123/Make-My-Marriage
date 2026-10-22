import { z } from "zod";
import { VENDOR_CATEGORIES } from "./vendor.types";
const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .refine(
      (v) => !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(v),
      "Remove control characters.",
    );
export const vendorId = z
  .string()
  .regex(/^[a-f\d]{24}$/i)
  .transform((v) => v.toLowerCase());
export const vendorInput = z
  .object({
    name: text(180).min(1),
    category: z.enum(VENDOR_CATEGORIES),
    contact: z
      .object({
        personName: text(120).default(""),
        phone: text(40)
          .refine(
            (v) => !v || /^[+\d\s().-]{3,40}$/.test(v),
            "Enter a valid phone number.",
          )
          .default(""),
        email: z.union([z.email().max(254), z.literal("")]).default(""),
      })
      .strict(),
    service: text(500).default(""),
    notes: text(2000).default(""),
    eventIds: z
      .array(vendorId)
      .max(100)
      .refine((v) => new Set(v).size === v.length, "Choose each event once.")
      .default([]),
  })
  .strict();
export const vendorCreate = z
  .object({ requestId: z.uuid(), vendor: vendorInput })
  .strict();
export const vendorEdit = z
  .object({ revision: z.number().int().min(0), vendor: vendorInput })
  .strict();
export const vendorRevision = z
  .object({ revision: z.number().int().min(0) })
  .strict();
export const vendorQuery = z
  .object({
    search: text(180).default(""),
    category: z.enum(VENDOR_CATEGORIES).optional(),
    eventId: vendorId.optional(),
    status: z.enum(["ACTIVE", "ARCHIVED"]).default("ACTIVE"),
    sort: z.enum(["NAME", "NEWEST"]).default("NAME"),
    page: z.coerce.number().int().min(1).max(10000).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(25),
  })
  .strict();
export type VendorInput = z.infer<typeof vendorInput>;
export type VendorQuery = z.infer<typeof vendorQuery>;
