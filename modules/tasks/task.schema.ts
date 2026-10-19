import { z } from "zod";
import { TASK_PRIORITIES, TASK_STATUSES } from "./task.types";
const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid reference.");
const checklist = z
  .array(
    z
      .object({
        id: z.string().uuid(),
        title: z.string().trim().min(1).max(160),
        done: z.boolean(),
      })
      .strict(),
  )
  .max(50)
  .refine(
    (items) => new Set(items.map((i) => i.id)).size === items.length,
    "Checklist IDs must be unique.",
  );
export const taskInputSchema = z
  .object({
    title: z.string().trim().min(1, "Enter a task title.").max(160),
    description: z.string().trim().max(2000).default(""),
    eventId: objectId.nullable().default(null),
    assigneeMemberIds: z
      .array(objectId)
      .max(30)
      .default([])
      .refine(
        (ids) => new Set(ids).size === ids.length,
        "Choose each member once.",
      ),
    dueAt: z.iso.datetime().nullable().default(null),
    priority: z.enum(TASK_PRIORITIES).default("MEDIUM"),
    status: z.enum(TASK_STATUSES).default("TODO"),
    checklist: checklist.default([]),
    revision: z.number().int().min(0).optional(),
  })
  .strict();
export const assignedTaskInputSchema = z
  .object({
    revision: z.number().int().min(0),
    status: z.enum(TASK_STATUSES).optional(),
    checklist: z
      .array(z.object({ id: z.string().uuid(), done: z.boolean() }).strict())
      .max(50)
      .optional(),
  })
  .strict()
  .refine(
    (v) => v.status !== undefined || v.checklist !== undefined,
    "No changes supplied.",
  );
// PATCH deliberately has no defaults: omitted fields must remain unchanged.
export const taskPatchSchema = z
  .object({
    title: z.string().trim().min(1).max(160).optional(),
    description: z.string().trim().max(2000).optional(),
    eventId: objectId.nullable().optional(),
    assigneeMemberIds: z
      .array(objectId)
      .max(30)
      .refine(
        (ids) => new Set(ids).size === ids.length,
        "Choose each member once.",
      )
      .optional(),
    dueAt: z.iso.datetime().nullable().optional(),
    priority: z.enum(TASK_PRIORITIES).optional(),
    status: z.enum(TASK_STATUSES).optional(),
    checklist: checklist.optional(),
    revision: z.number().int().min(0),
  })
  .strict()
  .refine(
    (v) => Object.keys(v).some((key) => key !== "revision"),
    "No changes supplied.",
  );
export const taskQuerySchema = z
  .object({
    q: z.string().trim().max(160).default(""),
    status: z.enum(TASK_STATUSES).optional(),
    priority: z.enum(TASK_PRIORITIES).optional(),
    eventId: objectId.optional(),
    assigneeMemberId: objectId.optional(),
    mine: z.enum(["true", "false"]).optional(),
    overdue: z.enum(["true", "false"]).optional(),
    page: z.coerce.number().int().min(1).max(10000).default(1),
  })
  .strict();
export const commentInputSchema = z
  .object({ body: z.string().trim().min(1).max(2000) })
  .strict();
