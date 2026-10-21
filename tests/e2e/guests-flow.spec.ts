import { test, expect, type Page } from "@playwright/test";
import mongoose, { Types } from "mongoose";
import argon2 from "argon2";
import { randomUUID, randomBytes } from "node:crypto";
import type {
  GuestView,
  GuestList,
  FamilyList,
  FamilyView,
  DuplicateDetails,
} from "../../modules/guests/guest.types";

test("Guests: lifecycle, duplicate review, family integrity, tenant isolation and responsive UI", async ({
  browser,
}, info) => {
  test.setTimeout(300000);
  test.skip(
    process.env.RUN_GUESTS_LIVE_QA !== "1",
    "Explicitly enable temporary development fixtures.",
  );
  try {
    process.loadEnvFile(".env.local");
  } catch {
    /* CI may supply configuration. */
  }
  if (!process.env.MONGODB_URI)
    throw Error("Development MongoDB configuration is required.");
  const conn = mongoose.createConnection(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 15000,
  });
  try {
    await conn.asPromise();
  } catch {
    throw Error("QA database connection failed.");
  }
  const db = conn.db!,
    marker = `guests-qa-${randomUUID()}`,
    password = randomBytes(24).toString("base64url"),
    userIds = Array.from({ length: 5 }, () => new Types.ObjectId());
  const contexts = await Promise.all(userIds.map(() => browser.newContext()));
  for (const context of contexts) context.setDefaultTimeout(15000);
  const [owner, foreign, viewer, denied, suspended] = await Promise.all(
    contexts.map((c) => c.newPage()),
  );
  const email = (n: number) => `${marker}-${n}@example.invalid`;
  async function api<T>(
    page: Page,
    method: string,
    url: string,
    data?: unknown,
    status = 200,
  ): Promise<T> {
    const response = await page.request.fetch(url, {
      method,
      ...(data === undefined ? {} : { data }),
    });
    expect(response.status(), `${method} ${url}`).toBe(status);
    return (await response.json()).data as T;
  }
  async function login(page: Page, n: number) {
    await page.goto("/login");
    await page.getByLabel("Email address", { exact: true }).fill(email(n));
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/\/(dashboard|onboarding)$/);
  }
  const families = (page = owner) =>
    api<FamilyList>(page, "GET", "/api/v1/families?limit=50");
  const get = (id: string, page = owner) =>
    api<{ guest: GuestView }>(page, "GET", `/api/v1/guests/${id}`).then(
      (r) => r.guest,
    );
  const createGuest = (data: object, page = owner) =>
    api<{ id: string }>(page, "POST", "/api/v1/guests", data, 201);
  const createFamily = (name: string, page = owner) =>
    api<{ id: string }>(page, "POST", "/api/v1/families", { name }, 201);
  async function patchKnownGuest(id: string, data: object) {
    const url = `/api/v1/guests/${id}`;
    const r = await owner.request.patch(url, { data });
    if (r.status() === 409) {
      const body = await r.json();
      expect(body.error.code).toBe("POSSIBLE_DUPLICATE");
      await api(owner, "PATCH", url, {
        ...data,
        duplicateConfirmation: body.error.details.confirmation,
      });
    } else expect(r.status()).toBe(200);
  }
  async function family(id: string): Promise<FamilyView> {
    return (await families()).families.find((f) => f.id === id)!;
  }
  async function shots(page: Page, label: string) {
    for (const [size, width, height] of [
      ["desktop", 1440, 1000],
      ["tablet", 820, 1180],
      ["mobile", 390, 844],
    ] as const) {
      await page.setViewportSize({ width, height });
      await expect
        .poll(() =>
          page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        )
        .toBe(true);
      await page.screenshot({
        path: info.outputPath(`${label}-${size}.png`),
        fullPage: true,
      });
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
  }
  function guestForm(page = owner) {
    return page.locator("section").filter({
      has: page.getByRole("heading", { name: "Add a guest", exact: true }),
    });
  }
  const tenantIds: Types.ObjectId[] = [];
  try {
    expect((await owner.request.get("/api/v1/guests")).status()).toBe(401);
    expect((await owner.request.get("/api/v1/families")).status()).toBe(401);
    const hash = await argon2.hash(password, { type: argon2.argon2id });
    await db.collection("users").insertMany(
      userIds.map((_id, n) => ({
        _id,
        email: email(n),
        displayName: `Guest QA ${n}`,
        passwordHash: hash,
        authProvider: "LOCAL",
        emailVerifiedAt: new Date(),
        status: "ACTIVE",
        sessionVersion: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
    );
    for (const [n, page] of [owner, foreign].entries()) {
      await login(page, n);
      await api(
        page,
        "POST",
        "/api/v1/auth/onboarding",
        {
          wedding: {
            brideName: "QA",
            groomName: "QA",
            title: `${marker}-${n}`,
            weddingDate: "2026-12-01",
            city: "Jaipur",
            timezone: "Asia/Kolkata",
            language: "en",
          },
        },
        201,
      );
      const session = await api<{ wedding: { id: string } }>(
        page,
        "GET",
        "/api/v1/auth/session",
      );
      tenantIds.push(new Types.ObjectId(session.wedding.id));
    }
    const viewerRole = new Types.ObjectId(),
      deniedRole = new Types.ObjectId(),
      suspendedRole = new Types.ObjectId();
    await db.collection("roles").insertMany(
      (
        [
          [viewerRole, ["VIEW_WEDDING", "VIEW_GUESTS"]],
          [deniedRole, ["VIEW_WEDDING"]],
          [suspendedRole, ["VIEW_WEDDING", "VIEW_GUESTS", "MANAGE_GUESTS"]],
        ] satisfies [Types.ObjectId, string[]][]
      ).map(([id, permissions], n) => ({
        _id: id,
        tenantId: tenantIds[0],
        key: `GUEST_QA_${n}`,
        name: `Guest QA role ${n}`,
        permissionKeys: permissions,
        isSystemRole: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
    );
    await db.collection("wedding_members").insertMany(
      [viewerRole, deniedRole, suspendedRole].map((roleId, n) => ({
        tenantId: tenantIds[0],
        userId: userIds[n + 2],
        roleIds: [roleId],
        membershipStatus: "ACTIVE",
        joinedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
    );
    await login(viewer, 2);
    await login(denied, 3);
    await login(suspended, 4);
    await db
      .collection("wedding_members")
      .updateOne(
        { tenantId: tenantIds[0], userId: userIds[4] },
        { $set: { membershipStatus: "SUSPENDED" } },
      );
    for (const p of [denied, suspended]) {
      expect((await p.request.get("/api/v1/guests")).status()).toBe(403);
      expect(
        (
          await p.request.post("/api/v1/guests", {
            data: { name: "Forbidden" },
          })
        ).status(),
      ).toBe(403);
    }
    await denied.goto("/guests");
    await expect(
      denied.getByRole("heading", { name: "Guests access restricted" }),
    ).toBeVisible();
    await shots(denied, "access-denied");

    await owner.goto("/guests");
    await expect(
      owner.getByRole("heading", { name: "Make room for your people" }),
    ).toBeVisible();
    await owner
      .getByRole("button", { name: "Guest ledger", exact: true })
      .click();
    await expect(
      owner.getByRole("heading", { name: "Make room for your people" }),
    ).toBeVisible();
    await shots(owner, "empty-guests");
    const aName = "QA Household One",
      bName = "QA Household Two";
    await owner
      .getByRole("button", { name: "Create family", exact: true })
      .click();
    const form = owner.locator("section").filter({
      has: owner.getByRole("heading", {
        name: "Create a family",
        exact: true,
      }),
    });
    await form.getByLabel("Family name", { exact: true }).fill(aName);
    await shots(owner, "family-create");
    await form
      .getByRole("button", { name: "Create family", exact: true })
      .click();
    await expect(form).toHaveCount(0);
    const a = (await families()).families.find((f) => f.name === aName)!;
    const b = await createFamily(bName);
    await owner
      .getByRole("button", { name: "Family households", exact: true })
      .click();
    await expect(
      owner.getByRole("heading", { name: aName, exact: true }),
    ).toBeVisible();
    await owner
      .getByRole("button", { name: "Family households", exact: true })
      .click();
    await expect(
      owner.getByRole("heading", { name: bName, exact: true }),
    ).toBeVisible();
    const aCard = owner.locator("article").filter({
      has: owner.getByRole("heading", { name: aName, exact: true }),
    });
    const bCard = owner.locator("article").filter({
      has: owner.getByRole("heading", { name: bName, exact: true }),
    });
    await aCard
      .getByRole("button", { name: "Add person", exact: true })
      .click();
    await guestForm()
      .getByLabel("Guest name", { exact: true })
      .fill("Discarded QA draft");
    await bCard
      .getByRole("button", { name: "Add person", exact: true })
      .click();
    await expect(
      guestForm().getByLabel("Guest name", { exact: true }),
    ).toHaveValue("");
    await expect(
      guestForm()
        .locator("summary")
        .filter({ hasText: `Family: ${bName}` }),
    ).toBeVisible();
    await guestForm()
      .getByLabel("Guest name", { exact: true })
      .fill("QA Primary Guest");
    await guestForm()
      .getByLabel(/^Phone \(optional\)/)
      .fill("+91 98765 43210");
    await guestForm()
      .getByLabel("Email (optional)", { exact: true })
      .fill("qa.primary@example.invalid");
    await shots(owner, "guest-create");
    await guestForm()
      .getByRole("button", { name: "Add guest", exact: true })
      .click();
    await expect(guestForm()).toHaveCount(0);
    const first = (
      await api<GuestList>(
        owner,
        "GET",
        "/api/v1/guests?search=QA%20Primary%20Guest",
      )
    ).guests[0];
    expect(first.familyId).toBe(b.id);
    expect(first.phone).toBe("+919876543210");
    expect(first.email).toBe("qa.primary@example.invalid");
    await expect(
      owner.getByRole("heading", { name: first.name, exact: true }),
    ).toBeVisible();
    await shots(owner, "guest-details");
    const bare = await createGuest({ name: "QA No Contact" });
    expect(await get(bare.id)).toMatchObject({
      phone: null,
      email: null,
      familyId: null,
      guestType: "PRIMARY",
    });
    const foreignGroup = await createFamily("Other wedding family", foreign),
      foreignGuest = await createGuest(
        {
          name: "Foreign private guest",
          phone: first.phone,
          familyId: foreignGroup.id,
        },
        foreign,
      );
    expect(
      (await foreign.request.get(`/api/v1/guests/${first.id}`)).status(),
    ).toBe(404);
    expect(
      (
        await foreign.request.patch(`/api/v1/guests/${first.id}`, {
          data: { revision: 0, name: "Forbidden" },
        })
      ).status(),
    ).toBe(404);
    expect(
      (
        await foreign.request.delete(`/api/v1/guests/${first.id}`, {
          data: { revision: 0 },
        })
      ).status(),
    ).toBe(409);
    expect(
      (
        await owner.request.post("/api/v1/guests", {
          data: { name: "Invalid reference", familyId: foreignGroup.id },
        })
      ).status(),
    ).toBe(400);
    expect(
      (
        await foreign.request.patch(`/api/v1/families/${b.id}`, {
          data: { name: "Forbidden", revision: 0 },
        })
      ).status(),
    ).toBe(404);
    expect(
      (
        await owner.request.patch(`/api/v1/families/${b.id}`, {
          data: { revision: 0, primaryContactGuestId: foreignGuest.id },
        })
      ).status(),
    ).toBe(400);
    expect(
      (
        await owner.request.post("/api/v1/guests", {
          data: { name: "Forged", tenantId: String(tenantIds[1]) },
        })
      ).status(),
    ).toBe(400);
    expect(
      (
        await owner.request.post("/api/v1/guests", {
          headers: { Origin: "https://other.example" },
          data: { name: "Forged" },
        })
      ).status(),
    ).toBe(403);
    expect(
      (
        await owner.request.post("/api/v1/guests", {
          headers: { "Content-Type": "text/plain" },
          data: "{}",
        })
      ).status(),
    ).toBe(415);

    // The read-only role may see records but cannot mutate through direct HTTP calls.
    await viewer.goto("/guests");
    await expect(
      viewer.getByText("You have read-only guest access.", { exact: false }),
    ).toBeVisible();
    await expect(
      viewer.getByRole("button", { name: "Add guest", exact: true }),
    ).toHaveCount(0);
    await shots(viewer, "read-only-guests");
    for (const [method, url, body] of [
      ["POST", "/api/v1/guests", { name: "Forbidden" }],
      [
        "PATCH",
        `/api/v1/guests/${first.id}`,
        { revision: 0, notes: "Forbidden" },
      ],
      ["DELETE", `/api/v1/guests/${first.id}`, { revision: 0 }],
      [
        "POST",
        `/api/v1/guests/${first.id}/restore`,
        { revision: 0, action: "RESTORE" },
      ],
      ["POST", "/api/v1/families", { name: "Forbidden" }],
      [
        "PATCH",
        `/api/v1/families/${b.id}`,
        { revision: 0, notes: "Forbidden" },
      ],
      ["DELETE", `/api/v1/families/${b.id}`, { revision: 0 }],
    ] as const)
      expect(
        (await viewer.request.fetch(url, { method, data: body })).status(),
      ).toBe(403);
    const ownList = await api<GuestList>(
      owner,
      "GET",
      "/api/v1/guests?status=ALL",
    );
    expect(ownList.guests.some((g) => g.id === foreignGuest.id)).toBe(false);

    await owner.getByRole("button", { name: "Add guest", exact: true }).click();
    await guestForm()
      .getByLabel("Guest name", { exact: true })
      .fill("QA Shared Contact");
    await guestForm()
      .getByLabel(/^Phone \(optional\)/)
      .fill(first.phone!);
    await guestForm()
      .getByRole("button", { name: "Add guest", exact: true })
      .click();
    await expect(
      owner.getByRole("heading", { name: "Someone familiar?" }),
    ).toBeVisible();
    await owner
      .getByRole("button", { name: "Review existing guest", exact: true })
      .click();
    await expect(
      owner.getByRole("heading", { name: first.name, exact: true }),
    ).toBeVisible();
    await shots(owner, "duplicate-review");
    const before = (await api<GuestList>(owner, "GET", "/api/v1/guests")).total;
    await guestForm().getByLabel("Guest name", { exact: true }).press("Enter");
    expect((await api<GuestList>(owner, "GET", "/api/v1/guests")).total).toBe(
      before,
    );
    await owner
      .getByRole("button", { name: "Confirm and keep both", exact: true })
      .click();
    await expect(guestForm()).toHaveCount(0);
    expect((await api<GuestList>(owner, "GET", "/api/v1/guests")).total).toBe(
      before + 1,
    );
    const dupPayload = { name: "QA Duplicate Fingerprint", phone: first.phone };
    const duplicate = await owner.request.post("/api/v1/guests", {
      data: dupPayload,
    });
    expect(duplicate.status()).toBe(409);
    const warning = (await duplicate.json()).error.details as DuplicateDetails;
    expect(warning.matches.every((m) => m.id !== foreignGuest.id)).toBe(true);
    expect(
      (
        await owner.request.post("/api/v1/guests", {
          data: {
            ...dupPayload,
            name: "Changed after review",
            duplicateConfirmation: warning.confirmation,
          },
        })
      ).status(),
    ).toBe(409);
    const twoSameNames = await createFamily(aName);
    expect(twoSameNames.id).not.toBe(a.id);

    // Primary contact selection in the real form, then transactional move/archive guards.
    await owner.goto("/guests");
    await owner
      .getByRole("button", { name: "Family households", exact: true })
      .click();
    await owner
      .locator("article")
      .filter({ has: owner.getByRole("heading", { name: bName, exact: true }) })
      .getByRole("button", { name: "Edit family", exact: true })
      .click();
    const editFamily = owner.locator("section").filter({
      has: owner.getByRole("heading", { name: "Edit family", exact: true }),
    });
    await editFamily
      .locator("summary")
      .filter({ hasText: "Primary contact:" })
      .click();
    await editFamily
      .getByRole("button", { name: first.name, exact: true })
      .click();
    await editFamily
      .getByRole("button", { name: "Save family", exact: true })
      .click();
    await expect(editFamily).toHaveCount(0);
    expect((await family(b.id)).primaryContactGuestId).toBe(first.id);
    const bCurrent = await family(b.id);
    await api(owner, "PATCH", `/api/v1/families/${b.id}`, {
      revision: bCurrent.revision,
      notes: "Private family context",
    });
    expect((await family(b.id)).primaryContactGuestId).toBe(first.id);
    await patchKnownGuest(first.id, {
      revision: first.revision,
      familyId: a.id,
    });
    expect((await family(b.id)).primaryContactGuestId).toBeNull();
    const moved = await get(first.id);
    expect(moved.phone).toBe(first.phone);
    expect(moved.email).toBe(first.email);
    const ac = await family(a.id);
    await api(owner, "PATCH", `/api/v1/families/${a.id}`, {
      revision: ac.revision,
      primaryContactGuestId: first.id,
    });
    expect(
      (
        await owner.request.delete(`/api/v1/families/${a.id}`, {
          data: { revision: (await family(a.id)).revision },
        })
      ).status(),
    ).toBe(409);
    await owner.goto("/guests");
    await owner
      .getByRole("button", { name: `View ${first.name}`, exact: true })
      .click();
    await owner
      .getByRole("button", { name: "Archive guest", exact: true })
      .click();
    await shots(owner, "archive-confirmation");
    await owner.getByRole("button", { name: "Confirm", exact: true }).click();
    await expect(
      owner.getByText(
        "Guest archived. You can restore them from Archived guests.",
        { exact: true },
      ),
    ).toBeVisible();
    expect((await get(first.id)).status).toBe("ARCHIVED");
    expect((await family(a.id)).primaryContactGuestId).toBeNull();
    expect(
      (
        await owner.request.delete(`/api/v1/families/${a.id}`, {
          data: { revision: (await family(a.id)).revision },
        })
      ).status(),
    ).toBe(409);
    const archived = await get(first.id);
    expect(
      (
        await owner.request.patch(`/api/v1/guests/${first.id}`, {
          data: { revision: archived.revision, name: "Blocked edit" },
        })
      ).status(),
    ).toBe(409);
    await owner
      .locator("label")
      .filter({ hasText: /^Status/ })
      .locator("select")
      .selectOption("ARCHIVED");
    await owner
      .getByRole("button", { name: `View ${first.name}`, exact: true })
      .click();
    await owner
      .getByRole("button", { name: "Restore guest", exact: true })
      .click();
    await owner.getByRole("button", { name: "Confirm", exact: true }).click();
    await expect(
      owner.getByText("Guest restored.", { exact: true }),
    ).toBeVisible();
    expect((await get(first.id)).status).toBe("ACTIVE");
    expect((await family(a.id)).primaryContactGuestId).toBeNull();
    expect(
      (
        await owner.request.delete(`/api/v1/guests/${first.id}`, {
          data: { revision: 0 },
        })
      ).status(),
    ).toBe(409);

    // Actual stale-edit UI preserves values and provides a discard/reload path.
    await owner.goto("/guests");
    await owner
      .getByRole("button", { name: `Edit QA No Contact`, exact: true })
      .click();
    const editGuest = owner.locator("section").filter({
      has: owner.getByRole("heading", { name: "Edit guest", exact: true }),
    });
    await editGuest
      .getByLabel("Guest name", { exact: true })
      .fill("QA Unsaved Name");
    const bareCurrent = await get(bare.id);
    await api(owner, "PATCH", `/api/v1/guests/${bare.id}`, {
      revision: bareCurrent.revision,
      notes: "Concurrent change",
    });
    await editGuest
      .getByRole("button", { name: "Save guest", exact: true })
      .click();
    await expect(editGuest.getByRole("alert")).toContainText(
      "Reload before editing",
    );
    await expect(
      editGuest.getByLabel("Guest name", { exact: true }),
    ).toHaveValue("QA Unsaved Name");
    await shots(owner, "stale-edit");
    await editGuest
      .getByRole("button", { name: "Cancel / discard edits", exact: true })
      .click();
    await owner
      .getByLabel("Search guests", { exact: true })
      .fill("No-such-guest-qa");
    await expect(
      owner.getByRole("heading", { name: "No matching guests" }),
    ).toBeVisible();
    await shots(owner, "no-results");
    await owner
      .getByRole("button", { name: "Clear filters", exact: true })
      .click();
    await owner.route("**/api/v1/guests?**", (route) =>
      route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({
          success: false,
          error: { code: "QA_ERROR", message: "Temporary QA list failure" },
        }),
      }),
    );
    await owner.reload();
    await expect(
      owner.getByText("Temporary QA list failure", { exact: true }),
    ).toBeVisible();
    await shots(owner, "fetch-error");
    await owner.unroute("**/api/v1/guests?**");
    await owner.getByRole("button", { name: "Try again", exact: true }).click();
    await expect(
      owner.getByRole("button", { name: `View ${first.name}`, exact: true }),
    ).toBeVisible();
    await shots(owner, "populated-guests");
    await owner
      .getByRole("button", { name: "Family households", exact: true })
      .click();
    await expect(
      owner.getByRole("heading", { name: bName, exact: true }),
    ).toBeVisible();
    await shots(owner, "families");
    // Delete a genuinely empty family through the UI confirmation.
    const bDelete = owner.locator("article").filter({
      has: owner.getByRole("heading", { name: bName, exact: true }),
    });
    await bDelete
      .getByRole("button", { name: "Delete empty family", exact: true })
      .click();
    await owner.getByRole("button", { name: "Confirm", exact: true }).click();
    await expect(
      owner.getByText("Empty family deleted.", { exact: true }),
    ).toBeVisible();
    expect((await families()).families.some((f) => f.id === b.id)).toBe(false);

    // Scale checks use seeded temporary records; 1,000 people are never rendered at once.
    const scale = Array.from({ length: 1000 }, (_, n) => ({
      tenantId: tenantIds[0],
      name: `QA Scale Guest ${String(n).padStart(4, "0")}`,
      normalizedName: `qa scale guest ${String(n).padStart(4, "0")}`,
      familyId: null,
      phone: null,
      email: null,
      relationship: "",
      side: n % 2 ? "BRIDE" : "GROOM",
      guestType: "PRIMARY",
      notes: "",
      status: "ACTIVE",
      source: "ADMIN",
      revision: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
    await db.collection("guests").insertMany(scale);
    const page1 = await api<GuestList>(
      owner,
      "GET",
      "/api/v1/guests?search=QA%20Scale%20Guest&limit=50&page=1",
    );
    const page20 = await api<GuestList>(
      owner,
      "GET",
      "/api/v1/guests?search=QA%20Scale%20Guest&limit=50&page=20",
    );
    expect(page1.total).toBe(1000);
    expect(page1.guests).toHaveLength(50);
    expect(page20.guests).toHaveLength(50);
    expect(
      page1.guests.some((g) => page20.guests.some((h) => g.id === h.id)),
    ).toBe(false);
    expect(
      (
        await api<GuestList>(
          owner,
          "GET",
          "/api/v1/guests?search=QA%20Scale%20Guest&side=BRIDE&limit=50",
        )
      ).total,
    ).toBe(500);
    const desc = await api<GuestList>(
      owner,
      "GET",
      "/api/v1/guests?search=QA%20Scale%20Guest&sortOrder=desc",
    );
    expect(desc.guests[0].name).toBe("QA Scale Guest 0999");
    await owner.goto("/guests");
    await owner
      .getByLabel("Search guests", { exact: true })
      .fill("QA Scale Guest");
    await expect(
      owner.getByText("1000 matching guests · each row is one person", {
        exact: true,
      }),
    ).toBeVisible();
    await owner
      .getByRole("button", { name: "Next", exact: true })
      .first()
      .click();
    await expect(
      owner.getByText("Page 2 of 40", { exact: true }),
    ).toBeVisible();
    for (let n = 0; n < 12; n++)
      await createFamily(`QA Picker ${String(n).padStart(2, "0")}`);
    await owner.getByRole("button", { name: "Add guest", exact: true }).click();
    await guestForm().locator("summary").filter({ hasText: "Family:" }).click();
    await guestForm()
      .getByRole("button", { name: "Next", exact: true })
      .click();
    await expect(
      guestForm().getByText("Page 2 of 2", { exact: true }),
    ).toBeVisible();
    await guestForm()
      .getByRole("button", { name: "Cancel / discard edits", exact: true })
      .click();
    const auditCount = await db.collection("activity_logs").countDocuments({
      tenantId: tenantIds[0],
      resourceType: { $in: ["GUEST", "GUEST_FAMILY"] },
    });
    expect(auditCount).toBeGreaterThan(10);
    console.log("GUEST_QA_LIFECYCLE_ACCESS_SCALE_PASSED");
  } catch (error) {
    await owner
      .screenshot({
        path: info.outputPath("failure-context.png"),
        fullPage: true,
      })
      .catch(() => {});
    throw error;
  } finally {
    // Resolve only weddings bearing this run's unpredictable marker, never personal tenants.
    const owned = await db
      .collection("weddings")
      .find({ title: { $regex: `^${marker}` } })
      .project({ _id: 1 })
      .toArray();
    const tenantFilter = { tenantId: { $in: owned.map((w) => w._id) } };
    for (const collection of [
      "guests",
      "guest_families",
      "activity_logs",
      "roles",
      "wedding_members",
    ])
      await db.collection(collection).deleteMany(tenantFilter);
    await db.collection("weddings").deleteMany({
      _id: { $in: owned.map((w) => w._id) },
      title: { $regex: `^${marker}` },
    });
    await db.collection("auth_tokens").deleteMany({ userId: { $in: userIds } });
    await db
      .collection("users")
      .deleteMany({ _id: { $in: userIds }, email: { $regex: `^${marker}` } });
    const remaining = {
      users: await db
        .collection("users")
        .countDocuments({ _id: { $in: userIds } }),
      weddings: await db
        .collection("weddings")
        .countDocuments({ title: { $regex: `^${marker}` } }),
      guests: await db.collection("guests").countDocuments(tenantFilter),
      families: await db
        .collection("guest_families")
        .countDocuments(tenantFilter),
    };
    for (const context of contexts) await context.close();
    await conn.close();
    expect(remaining).toEqual({
      users: 0,
      weddings: 0,
      guests: 0,
      families: 0,
    });
    console.log("GUEST_QA_CLEANUP_CONFIRMED");
  }
});
