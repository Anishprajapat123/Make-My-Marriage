import { test, expect, type Page } from "@playwright/test";
import mongoose, { Types } from "mongoose";
import argon2 from "argon2";
import { randomUUID } from "node:crypto";

test("Tasks: live planner/assigned access, two tenants, CRUD and responsive UI", async ({
  browser,
}, testInfo) => {
  test.setTimeout(240000);
  test.skip(
    process.env.RUN_TASKS_LIVE_QA !== "1",
    "Explicitly enable temporary development fixtures with RUN_TASKS_LIVE_QA=1.",
  );
  try {
    process.loadEnvFile(".env.local");
  } catch {
    /* A CI environment may supply configuration directly. */
  }
  if (!process.env.MONGODB_URI)
    throw new Error("A development MONGODB_URI is required.");
  const connection = mongoose.createConnection(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 15000,
  });
  try {
    await connection.asPromise();
  } catch {
    throw new Error(
      "QA database connection failed; check local configuration.",
    );
  }
  const db = connection.db!;
  const marker = `tasks-qa-${randomUUID()}`;
  const userIds = Array.from({ length: 3 }, () => new Types.ObjectId());
  const contexts = await Promise.all([
    browser.newContext(),
    browser.newContext(),
    browser.newContext(),
  ]);
  const pages = await Promise.all(contexts.map((c) => c.newPage()));
  const tenantIds: Types.ObjectId[] = [];
  const password = `${randomUUID()}Aa1!`;
  async function login(page: Page, index: number) {
    await page.goto("/login");
    await page
      .getByLabel("Email address", { exact: true })
      .fill(`${marker}-${index}@example.invalid`);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/\/(onboarding|dashboard)$/);
  }
  async function screenshots(page: Page, label: string) {
    for (const [name, width, height] of [
      ["desktop", 1440, 1000],
      ["tablet", 820, 1180],
      ["mobile", 390, 844],
    ] as const) {
      await page.setViewportSize({ width, height });
      await expect
        .poll(() =>
          page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth,
          ),
        )
        .toBe(true);
      await page.screenshot({
        path: testInfo.outputPath(`${label}-${name}.png`),
        fullPage: true,
      });
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
  }
  try {
    expect((await pages[0].request.get("/api/v1/tasks")).status()).toBe(401);
    await db.collection("users").insertMany(
      userIds.map((_id, index) => ({
        _id,
        email: `${marker}-${index}@example.invalid`,
        displayName: `QA ${index === 2 ? "Family" : "Planner"}`,
        authProvider: "LOCAL",
        passwordHash: null,
        emailVerifiedAt: new Date(),
        status: "ACTIVE",
        sessionVersion: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
    );
    const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
    await db
      .collection("users")
      .updateMany({ _id: { $in: userIds } }, { $set: { passwordHash } });
    for (const index of [0, 1]) {
      await login(pages[index], index);
      const result = await pages[index].request.post(
        "/api/v1/auth/onboarding",
        {
          data: {
            wedding: {
              brideName: "QA",
              groomName: "QA",
              title: `${marker}-${index}`,
              weddingDate: "2026-12-01",
              city: "Jaipur",
              timezone: "Asia/Kolkata",
              language: "en",
            },
          },
        },
      );
      expect(result.status()).toBe(201);
      const session = await pages[index].request.get("/api/v1/auth/session");
      tenantIds.push(
        new Types.ObjectId((await session.json()).data.wedding.id),
      );
    }
    const familyRole = await db.collection("roles").findOne({
      tenantId: tenantIds[0],
      key: "FAMILY_MEMBER",
      isSystemRole: true,
    });
    expect(familyRole?.permissionKeys).toEqual(
      expect.arrayContaining(["VIEW_ASSIGNED_TASKS", "UPDATE_ASSIGNED_TASKS"]),
    );
    const familyId = new Types.ObjectId();
    await db.collection("wedding_members").insertOne({
      _id: familyId,
      tenantId: tenantIds[0],
      userId: userIds[2],
      roleIds: [familyRole!._id],
      membershipStatus: "ACTIVE",
      joinedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await login(pages[2], 2);
    const [owner, foreign, family] = pages;
    await owner.goto("/tasks");
    await expect(
      owner.getByRole("heading", { name: "Room for your next small step" }),
    ).toBeVisible();
    await screenshots(owner, "empty");
    await owner
      .getByRole("link", { name: "Create task", exact: true })
      .first()
      .click();
    await expect(
      owner.getByRole("heading", { name: "Record a small next step" }),
    ).toBeVisible();
    await screenshots(owner, "create");
    await owner
      .getByLabel("Task title", { exact: true })
      .fill("QA wedding flowers");
    await owner
      .getByText("Assignees, deadline & event (optional)", { exact: true })
      .click();
    await owner.getByLabel("QA Family", { exact: true }).check();
    await owner.getByLabel("Deadline date", { exact: true }).fill("2026-10-01");
    await owner.getByLabel("Deadline time", { exact: true }).fill("18:30");
    await owner
      .getByLabel("Notes (optional)", { exact: true })
      .fill("Arrange local flowers.");
    await owner.getByRole("button", { name: "Add checklist item" }).click();
    await owner.getByLabel("Step 1", { exact: true }).fill("Call florist");
    await owner
      .getByRole("button", { name: "Create task", exact: true })
      .click();
    await expect(owner).toHaveURL(/\/tasks\/[a-f\d]{24}$/);
    const id = owner.url().split("/").pop()!;
    await expect(
      owner.getByRole("heading", { name: "QA wedding flowers" }),
    ).toBeVisible();
    await screenshots(owner, "details");
    const initial = (
      await (await owner.request.get(`/api/v1/tasks/${id}`)).json()
    ).data.task;
    expect(initial.dueAt).toBe("2026-10-01T13:00:00.000Z");
    await owner
      .getByLabel("Add a comment", { exact: true })
      .fill("Confirm delivery tomorrow.");
    await owner
      .getByRole("button", { name: "Post comment", exact: true })
      .click();
    await expect(
      owner.getByText("Confirm delivery tomorrow.", { exact: true }),
    ).toBeVisible();
    const other = await owner.request.post("/api/v1/tasks", {
      data: { title: "QA private planner task" },
    });
    expect(other.status()).toBe(201);
    const otherId = (await other.json()).data.task.id;
    for (const page of [foreign, family]) {
      expect(
        (await page.request.get(`/api/v1/tasks/${otherId}`)).status(),
      ).toBe(404);
      expect(
        (await page.request.get(`/api/v1/tasks/${otherId}/comments`)).status(),
      ).toBe(404);
      expect(
        (await page.request.get(`/api/v1/tasks/${otherId}/activity`)).status(),
      ).toBe(404);
    }
    expect((await foreign.request.get(`/api/v1/tasks/${id}`)).status()).toBe(
      404,
    );
    expect(
      (
        await foreign.request.patch(`/api/v1/tasks/${id}`, {
          data: { revision: 0, status: "COMPLETED" },
        })
      ).status(),
    ).toBe(404);
    expect((await family.request.get("/api/v1/tasks/options")).status()).toBe(
      403,
    );
    expect(
      (
        await family.request.post("/api/v1/tasks", {
          data: { title: "forbidden" },
        })
      ).status(),
    ).toBe(403);
    expect(
      (
        await family.request.post(`/api/v1/tasks/${id}/comments`, {
          data: { body: "forbidden" },
        })
      ).status(),
    ).toBe(403);
    expect(
      (
        await family.request.delete(`/api/v1/tasks/${id}`, {
          data: { revision: 0 },
        })
      ).status(),
    ).toBe(403);
    expect(
      (
        await family.request.patch(`/api/v1/tasks/${id}`, {
          data: { revision: 0, title: "forbidden" },
        })
      ).status(),
    ).toBe(400);
    await family.goto("/tasks");
    await expect(
      family.getByRole("heading", { name: "QA wedding flowers" }),
    ).toBeVisible();
    await expect(family.getByText("QA private planner task")).toHaveCount(0);
    await expect(
      family.getByRole("link", { name: "Create task", exact: true }),
    ).toHaveCount(0);
    const familyList = (
      await (await family.request.get("/api/v1/tasks")).json()
    ).data;
    expect(familyList.counts.total).toBe(1);
    expect(familyList.counts.overdue).toBe(1);
    await screenshots(family, "assigned-list");
    await family.goto(`/tasks/${id}`);
    await expect(family.getByRole("link", { name: "Edit task" })).toHaveCount(
      0,
    );
    await family.getByLabel("Call florist", { exact: true }).click();
    await expect(
      family.getByLabel("Call florist", { exact: true }),
    ).toBeChecked();
    await expect(
      family.getByRole("status").filter({ hasText: "Task updated." }),
    ).toBeVisible();
    await family
      .getByLabel("Task status", { exact: true })
      .selectOption("COMPLETED");
    await expect
      .poll(
        async () =>
          (await (await family.request.get(`/api/v1/tasks/${id}`)).json()).data
            .task.status,
      )
      .toBe("COMPLETED");
    await screenshots(family, "assigned-details");
    expect(
      (
        await owner.request.patch(`/api/v1/tasks/${id}`, {
          data: { revision: initial.revision, status: "WAITING" },
        })
      ).status(),
    ).toBe(409);
    for (const query of [
      "status=COMPLETED",
      "priority=MEDIUM",
      "mine=true",
      "overdue=true",
      "q=does-not-exist",
    ]) {
      const r = await owner.request.get(`/api/v1/tasks?${query}`);
      expect(r.status()).toBe(200);
      const d = (await r.json()).data;
      expect(d.counts.total).toBe(2);
      if (["mine=true", "overdue=true", "q=does-not-exist"].includes(query))
        expect(d.tasks).toHaveLength(0);
    }
    const foreignMember = await db
      .collection("wedding_members")
      .findOne({ tenantId: tenantIds[1], userId: userIds[1] });
    expect(
      (
        await owner.request.post("/api/v1/tasks", {
          data: {
            title: "Bad reference",
            assigneeMemberIds: [String(foreignMember!._id)],
          },
        })
      ).status(),
    ).toBe(400);
    expect(
      (
        await owner.request.post("/api/v1/tasks", {
          data: { title: "Bad event", eventId: String(new Types.ObjectId()) },
        })
      ).status(),
    ).toBe(400);
    await db
      .collection("wedding_members")
      .updateOne(
        { _id: familyId, tenantId: tenantIds[0] },
        { $set: { membershipStatus: "SUSPENDED" } },
      );
    expect((await family.request.get(`/api/v1/tasks/${id}`)).status()).toBe(
      403,
    );
    expect(
      (
        await owner.request.post("/api/v1/tasks", {
          data: {
            title: "Inactive assignee",
            assigneeMemberIds: [String(familyId)],
          },
        })
      ).status(),
    ).toBe(400);
    await db
      .collection("wedding_members")
      .updateOne(
        { _id: familyId, tenantId: tenantIds[0] },
        { $set: { membershipStatus: "ACTIVE" } },
      );
    await db
      .collection("roles")
      .updateOne(
        { _id: familyRole!._id, tenantId: tenantIds[0] },
        { $set: { permissionKeys: [] } },
      );
    expect((await family.request.get("/api/v1/tasks")).status()).toBe(403);
    await family.goto("/tasks");
    await expect(
      family.getByRole("heading", { name: "Tasks access restricted" }),
    ).toBeVisible();
    await db
      .collection("roles")
      .updateOne(
        { _id: familyRole!._id, tenantId: tenantIds[0] },
        { $set: { permissionKeys: familyRole!.permissionKeys } },
      );
    await owner.goto("/tasks");
    await expect(
      owner.getByRole("heading", { name: "QA private planner task" }),
    ).toBeVisible();
    await screenshots(owner, "populated-list");
    await owner
      .getByLabel("Search tasks", { exact: true })
      .fill("does-not-exist");
    await expect(
      owner.getByRole("heading", { name: "No tasks match these filters" }),
    ).toBeVisible();
    await screenshots(owner, "no-results");
    await owner.getByRole("button", { name: "Clear filters" }).click();
    await expect(
      owner.getByRole("heading", { name: "QA private planner task" }),
    ).toBeVisible();
    await owner.route("**/api/v1/tasks?*", (route) =>
      route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({
          success: false,
          error: { message: "QA temporary outage" },
        }),
      }),
    );
    await owner.reload();
    await expect(
      owner.getByRole("alert").filter({ hasText: "QA temporary outage" }),
    ).toBeVisible();
    await screenshots(owner, "fetch-error");
    await owner.unroute("**/api/v1/tasks?*");
    await owner.getByRole("button", { name: "Try again", exact: true }).click();
    await expect(
      owner.getByRole("heading", { name: "QA private planner task" }),
    ).toBeVisible();
    const eventResponse = await owner.request.post("/api/v1/events", {
      data: {
        name: "QA linked ceremony",
        date: "2026-12-01",
        startTime: "18:00",
        status: "DRAFT",
        venue: { name: "QA hall", addressLine1: "QA road", city: "Jaipur" },
      },
    });
    expect(eventResponse.status()).toBe(201);
    const event = (await eventResponse.json()).data.event;
    const linkedResponse = await owner.request.post("/api/v1/tasks", {
      data: { title: "QA linked task", eventId: event.id },
    });
    expect(linkedResponse.status()).toBe(201);
    const linked = (await linkedResponse.json()).data.task;
    expect(
      (
        await owner.request.delete(
          `/api/v1/events/${event.id}?updatedAt=${encodeURIComponent(event.updatedAt)}`,
        )
      ).status(),
    ).toBe(409);
    expect(
      (
        await owner.request.delete(`/api/v1/tasks/${linked.id}`, {
          data: { revision: linked.revision },
        })
      ).status(),
    ).toBe(200);
    expect(
      (
        await owner.request.delete(
          `/api/v1/events/${event.id}?updatedAt=${encodeURIComponent(event.updatedAt)}`,
        )
      ).status(),
    ).toBe(200);
    await owner.goto(`/tasks/${id}/edit`);
    await expect(
      owner.getByRole("heading", { name: "Edit your task" }),
    ).toBeVisible();
    await screenshots(owner, "edit");
    await owner
      .getByLabel("Task title", { exact: true })
      .fill("QA flowers updated");
    await owner
      .getByRole("button", { name: "Save changes", exact: true })
      .click();
    await expect(
      owner.getByRole("heading", { name: "QA flowers updated" }),
    ).toBeVisible();
    await owner
      .getByRole("button", { name: "Delete task", exact: true })
      .click();
    await owner
      .getByRole("button", { name: "Confirm deletion", exact: true })
      .click();
    await expect(owner).toHaveURL(/\/tasks$/);
    expect((await owner.request.get(`/api/v1/tasks/${id}`)).status()).toBe(404);
    expect(
      await db.collection("task_comments").countDocuments({
        tenantId: tenantIds[0],
        taskId: new Types.ObjectId(id),
      }),
    ).toBe(0);
    expect(
      await db.collection("activity_logs").countDocuments({
        tenantId: tenantIds[0],
        resourceId: new Types.ObjectId(id),
      }),
    ).toBeGreaterThan(3);
  } finally {
    // Discover tenants even if onboarding succeeded but a subsequent assertion failed.
    const owned = await db
      .collection("wedding_members")
      .find({ userId: { $in: userIds } })
      .toArray();
    const tenants = [...tenantIds, ...owned.map((m) => m.tenantId)];
    for (const collection of [
      "tasks",
      "task_comments",
      "activity_logs",
      "events",
      "roles",
      "wedding_members",
    ])
      await db
        .collection(collection)
        .deleteMany({ tenantId: { $in: tenants } });
    await db
      .collection("weddings")
      .deleteMany({ _id: { $in: tenants }, title: { $regex: `^${marker}` } });
    await db
      .collection("users")
      .deleteMany({ _id: { $in: userIds }, email: { $regex: `^${marker}` } });
    for (const context of contexts) await context.close();
    await connection.close();
  }
});
