import { z } from "zod";

const weddingDetailsSchema = z.object({
  brideName: z.string().trim().min(2).max(120),
  groomName: z.string().trim().min(2).max(120),
  title: z.string().trim().min(2).max(160),
  weddingDate: z.iso.date(),
  city: z.string().trim().min(2).max(120),
  timezone: z
    .string()
    .trim()
    .min(1)
    .max(80)
    .refine((timezone) => {
      try {
        new Intl.DateTimeFormat("en", { timeZone: timezone });
        return true;
      } catch {
        return false;
      }
    }, "Choose a valid IANA time zone."),
  language: z.enum(["en", "hi"]),
});

export const createWeddingSchema = z
  .object({ wedding: weddingDetailsSchema })
  .strict();

export type CreateWeddingInput = z.infer<typeof createWeddingSchema>["wedding"];
