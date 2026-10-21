import { test, expect, type Page } from "@playwright/test";
import mongoose, { Types } from "mongoose";
import argon2 from "argon2";
import { randomBytes, randomUUID, createHash } from "node:crypto";
import type {
  PublicInvitation,
  InvitationConfig,
  InvitationList,
} from "../../modules/invitations/invitation.types";
test("Guest invitation and RSVP: public party, companions, lifecycle and Events access", async ({
  browser,
}, info) => {
  test.setTimeout(240000);
  test.skip(
    process.env.RUN_INVITATIONS_LIVE_QA !== "1",
    "Explicitly enable temporary development fixtures.",
  );
  try {
    process.loadEnvFile(".env.local");
  } catch {
    /* CI environment */
  }
  if (!process.env.MONGODB_URI)
    throw Error("Development database is required.");
  const conn = mongoose.createConnection(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 15000,
  });
  try {
    await conn.asPromise();
  } catch {
    throw Error("QA database connection failed.");
  }
  const db = conn.db!,
    marker = `invitations-qa-${randomUUID()}`,
    password = randomBytes(24).toString("base64url"),
    ids = Array.from({ length: 3 }, () => new Types.ObjectId());
  const contexts = await Promise.all(ids.map(() => browser.newContext()));
  const guestContext = await browser.newContext();
  contexts.push(guestContext);
  for (const c of contexts) c.setDefaultTimeout(15000);
  const [owner, foreign, member] = await Promise.all(
    contexts.slice(0, 3).map((c) => c.newPage()),
  );
  const guest = await guestContext.newPage();
  const tenantIds: Types.ObjectId[] = [],
    tokens: string[] = [];
  const startMinute = Math.floor(Date.now() / 60000);
  const email = (n: number) => `${marker}-${n}@example.invalid`;
  async function api<T>(
    p: Page,
    method: string,
    url: string,
    data?: unknown,
    status = 200,
  ): Promise<T> {
    const r = await p.request.fetch(url, {
      method,
      ...(data === undefined ? {} : { data }),
    });
    expect(r.status(), `${method} invitation endpoint`).toBe(status);
    return (await r.json()).data as T;
  }
  async function login(p: Page, n: number) {
    await p.goto("/login");
    await p.getByLabel("Email address", { exact: true }).fill(email(n));
    await p.getByLabel("Password", { exact: true }).fill(password);
    await p.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(p).toHaveURL(/\/(dashboard|onboarding)$/);
  }
  async function list() {
    return api<InvitationList>(owner, "GET", "/api/v1/invitations/status");
  }
  async function issue(id: string, action: "ISSUE" | "REPLACE" = "ISSUE") {
    const row = (await list()).rows.find((r) => r.guestId === id)!;
    const r = await api<{ url: string }>(
      owner,
      "POST",
      "/api/v1/invitations/guest-links",
      { guestId: id, action, revision: row.revision },
    );
    const token = new URL(r.url).pathname.split("/").pop()!;
    tokens.push(token);
    return token;
  }
  const publicGet = (token: string) =>
    api<PublicInvitation>(guest, "GET", `/api/v1/public/invitations/${token}`);
  async function screenshots(p: Page, label: string) {
    for (const [name, width, height] of [
      ["desktop", 1440, 1000],
      ["mobile", 390, 844],
    ] as const) {
      await p.setViewportSize({ width, height });
      await expect
        .poll(() =>
          p.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        )
        .toBe(true);
      await p.screenshot({
        path: info.outputPath(`${label}-${name}.png`),
        fullPage: true,
      });
    }
    await p.setViewportSize({ width: 1440, height: 1000 });
  }
  try {
    const hash = await argon2.hash(password, { type: argon2.argon2id });
    await db.collection("users").insertMany(
      ids.map((_id, n) => ({
        _id,
        email: email(n),
        displayName: `Invitation QA ${n}`,
        passwordHash: hash,
        authProvider: "LOCAL",
        emailVerifiedAt: new Date(),
        status: "ACTIVE",
        sessionVersion: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
    );
    for (const [n, p] of [owner, foreign].entries()) {
      await login(p, n);
      await api(
        p,
        "POST",
        "/api/v1/auth/onboarding",
        {
          wedding: {
            brideName: "QA Bride",
            groomName: "QA Groom",
            title: `${marker}-${n}`,
            weddingDate: "2026-12-01",
            city: "Jaipur",
            timezone: "Asia/Kolkata",
            language: "en",
          },
        },
        201,
      );
      const s = await api<{ wedding: { id: string } }>(
        p,
        "GET",
        "/api/v1/auth/session",
      );
      tenantIds.push(new Types.ObjectId(s.wedding.id));
    }
    const role = await db.collection("roles").findOne({
      tenantId: tenantIds[0],
      key: "FAMILY_MEMBER",
      isSystemRole: true,
    });
    expect(role?.permissionKeys).toContain("VIEW_EVENTS");
    await db.collection("wedding_members").insertOne({
      tenantId: tenantIds[0],
      userId: ids[2],
      roleIds: [role!._id],
      membershipStatus: "ACTIVE",
      joinedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await login(member, 2);
    const ownerMember = await db
      .collection("wedding_members")
      .findOne({ tenantId: tenantIds[0], userId: ids[0] });
    const events = await db.collection("events").insertMany(
      ["PUBLISHED", "DRAFT"].map((status, n) => ({
        tenantId: tenantIds[0],
        createdByMemberId: ownerMember!._id,
        name: n ? "Private draft ceremony" : "Public wedding ceremony",
        status,
        startAt: new Date("2026-12-01T10:00:00Z"),
        endAt: null,
        description: "Celebrate with us",
        notes: "PRIVATE_INTERNAL_EVENT_NOTE",
        dressCode: "Festive",
        ceremonyType: "",
        venue: {
          name: "QA Courtyard",
          addressLine1: "1 QA Road",
          city: "Jaipur",
          mapUrl: "https://example.com/map",
          directions: "Main entrance",
        },
        timelineItems: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
    );
    await member.goto("/events");
    await expect(
      member.getByRole("heading", { name: "Events", exact: true }),
    ).toBeVisible();
    await expect(
      member.getByRole("link", { name: "Create event", exact: true }),
    ).toHaveCount(0);
    expect((await member.request.get("/api/v1/events")).status()).toBe(200);
    expect(
      (await member.request.post("/api/v1/events", { data: {} })).status(),
    ).toBe(403);
    await member.goto("/events/new");
    await expect(
      member.getByRole("heading", { name: "Events access restricted" }),
    ).toBeVisible();
    await screenshots(member, "family-events-restricted-edit");
    const first = await api<{ id: string }>(
      owner,
      "POST",
      "/api/v1/guests",
      {
        name: "QA Invited Person",
        phone: "+919876543210",
        email: "private-contact@example.invalid",
        notes: "PRIVATE_GUEST_NOTE",
      },
      201,
    );
    const second = await api<{ id: string }>(
      owner,
      "POST",
      "/api/v1/guests",
      { name: "QA Other Person" },
      201,
    );
    expect((await guest.request.get("/api/v1/invitations")).status()).toBe(401);
    expect(
      (
        await member.request.post("/api/v1/invitations/guest-links", {
          data: { guestId: first.id, action: "ISSUE", revision: null },
        })
      ).status(),
    ).toBe(403);
    await owner.goto("/invitations");
    await expect(
      owner.getByRole("heading", { name: "Invitations & RSVP" }),
    ).toBeVisible();
    await owner
      .getByLabel("Invitation title", { exact: true })
      .fill("You are invited to our wedding");
    await owner
      .getByLabel("Welcome message", { exact: true })
      .fill("We would love to celebrate together.");
    await owner.getByLabel("Publish invitation", { exact: true }).check();
    await owner
      .getByRole("button", { name: "Save invitation", exact: true })
      .click();
    await expect(
      owner
        .locator("summary")
        .filter({ hasText: "Invitation content · Published" }),
    ).toBeVisible();
    const token = await issue(first.id);
    const pub = await publicGet(token);
    expect(pub.guest.name).toBe("QA Invited Person");
    expect(pub.events.map((e) => e.name)).toEqual(["Public wedding ceremony"]);
    const serialized = JSON.stringify(pub);
    for (const forbidden of [
      "PRIVATE_INTERNAL_EVENT_NOTE",
      "PRIVATE_GUEST_NOTE",
      "private-contact@example.invalid",
      "+919876543210",
      "QA Other Person",
      String(tenantIds[0]),
      first.id,
    ])
      expect(serialized).not.toContain(forbidden);
    const stored = await db.collection("invitation_links").findOne({
      tenantId: tenantIds[0],
      guestId: new Types.ObjectId(first.id),
    });
    expect(stored?.tokenHash).toBe(
      createHash("sha256").update(token).digest("hex"),
    );
    expect(JSON.stringify(stored)).not.toContain(token);
    await guest.goto(`/invite/${token}`);
    await expect(
      guest.getByRole("heading", { name: "Will you join us?" }),
    ).toBeVisible();
    await screenshots(guest, "public-invitation");
    await guest
      .getByRole("radio", { name: "Yes, I’ll be there", exact: true })
      .check();
    await guest
      .getByRole("button", { name: "Add named companion", exact: false })
      .click();
    await guest
      .getByLabel("Companion name", { exact: true })
      .fill("QA Named Companion");
    await guest
      .getByRole("button", { name: "Add named companion", exact: false })
      .click();
    await guest
      .getByLabel("Companion name", { exact: true })
      .nth(1)
      .fill("QA Named Child");
    await guest
      .locator("label")
      .filter({ hasText: /^Guest type/ })
      .locator("select")
      .nth(1)
      .selectOption("CHILD");
    await screenshots(guest, "named-companions");
    await guest
      .getByRole("button", { name: "Save my RSVP", exact: true })
      .click();
    await expect(guest.getByRole("status")).toContainText(
      "Your response is saved",
    );
    let current = await publicGet(token);
    expect(current.rsvp.response).toBe("YES");
    expect(current.rsvp.companions).toHaveLength(2);
    expect(
      await db.collection("guests").countDocuments({
        tenantId: tenantIds[0],
        addedByGuestId: new Types.ObjectId(first.id),
      }),
    ).toBe(2);
    const payload = {
      attendance: "YES",
      revision: current.rsvp.revision,
      requestId: randomUUID(),
      companions: current.rsvp.companions.map(
        ({ clientId, name, guestType }) => ({ clientId, name, guestType }),
      ),
    };
    await api(
      guest,
      "POST",
      `/api/v1/public/invitations/${token}/rsvp`,
      payload,
    );
    await api(
      guest,
      "POST",
      `/api/v1/public/invitations/${token}/rsvp`,
      payload,
    );
    expect(
      await db.collection("guests").countDocuments({
        tenantId: tenantIds[0],
        addedByGuestId: new Types.ObjectId(first.id),
      }),
    ).toBe(2);
    expect(
      (
        await guest.request.post(`/api/v1/public/invitations/${token}/rsvp`, {
          data: { ...payload, attendance: "NO", companions: [] },
        })
      ).status(),
    ).toBe(409);
    expect(
      (
        await guest.request.post(`/api/v1/public/invitations/${token}/rsvp`, {
          data: { ...payload, requestId: randomUUID(), revision: 0 },
        })
      ).status(),
    ).toBe(409);
    current = await publicGet(token);
    const collision = {
      attendance: "YES",
      revision: current.rsvp.revision,
      requestId: randomUUID(),
      companions: [
        ...current.rsvp.companions.map(({ clientId, name, guestType }) => ({
          clientId,
          name,
          guestType,
        })),
        {
          clientId: randomUUID(),
          name: "QA Other Person",
          guestType: "COMPANION",
        },
      ],
    };
    const warning = await guest.request.post(
      `/api/v1/public/invitations/${token}/rsvp`,
      { data: collision },
    );
    expect(warning.status()).toBe(409);
    const warningBody = await warning.json();
    expect(warningBody.error.code).toBe("COMPANION_REVIEW_REQUIRED");
    expect(JSON.stringify(warningBody.error.details)).not.toContain(second.id);
    await api(guest, "POST", `/api/v1/public/invitations/${token}/rsvp`, {
      ...collision,
      duplicateConfirmation: warningBody.error.details.confirmation,
    });
    current = await publicGet(token);
    await api(guest, "POST", `/api/v1/public/invitations/${token}/rsvp`, {
      attendance: "NO",
      revision: current.rsvp.revision,
      requestId: randomUUID(),
      companions: [],
    });
    let stats = await api<{
      counts: { yes: number; no: number; pending: number };
    }>(owner, "GET", "/api/v1/rsvp/stats");
    expect(stats.counts).toMatchObject({ yes: 0, no: 4, pending: 1 });
    current = await publicGet(token);
    const only = current.rsvp.companions[0];
    await api(guest, "POST", `/api/v1/public/invitations/${token}/rsvp`, {
      attendance: "YES",
      revision: current.rsvp.revision,
      requestId: randomUUID(),
      companions: [
        { clientId: only.clientId, name: only.name, guestType: only.guestType },
      ],
    });
    stats = await api(owner, "GET", "/api/v1/rsvp/stats");
    expect(stats.counts.yes).toBe(2);
    const otherToken = await issue(second.id);
    const otherView = await publicGet(otherToken);
    expect(otherView.rsvp.companions).toHaveLength(0);
    expect(JSON.stringify(otherView)).not.toContain("QA Named Companion");
    await api(foreign, "POST", "/api/v1/invitations", {
      title: "Foreign QA invitation",
      welcomeMessage: "",
      story: "",
      language: "en",
      published: false,
      revision: null,
    });
    expect(
      (
        await foreign.request.post("/api/v1/invitations/guest-links", {
          data: { guestId: first.id, action: "ISSUE", revision: null },
        })
      ).status(),
    ).toBe(404);
    await owner.reload();
    await expect(
      owner.getByRole("heading", { name: "Invitations & RSVP" }),
    ).toBeVisible();
    await expect(owner.getByText("Loading invitations...")).toBeHidden();
    await expect(
      owner.getByRole("region", { name: "Invitation and RSVP counts" }),
    ).toBeVisible();
    await screenshots(owner, "host-rsvp-overview");
    let linkRow = (await list()).rows.find((r) => r.guestId === first.id)!;
    await api(owner, "POST", "/api/v1/invitations/guest-links", {
      guestId: first.id,
      action: "REVOKE",
      revision: linkRow.revision,
    });
    expect(
      (await guest.request.get(`/api/v1/public/invitations/${token}`)).status(),
    ).toBe(410);
    const fresh = await issue(first.id, "REPLACE");
    expect(
      (await guest.request.get(`/api/v1/public/invitations/${token}`)).status(),
    ).toBe(410);
    expect((await publicGet(fresh)).rsvp.response).toBe("YES");
    const guestRecord = await api<{ guest: { revision: number } }>(
      owner,
      "GET",
      `/api/v1/guests/${first.id}`,
    );
    await api(owner, "DELETE", `/api/v1/guests/${first.id}`, {
      revision: guestRecord.guest.revision,
    });
    expect(
      (await guest.request.get(`/api/v1/public/invitations/${fresh}`)).status(),
    ).toBe(410);
    await api(owner, "POST", `/api/v1/guests/${first.id}/restore`, {
      revision: guestRecord.guest.revision + 1,
      action: "RESTORE",
    });
    expect(
      (await guest.request.get(`/api/v1/public/invitations/${fresh}`)).status(),
    ).toBe(410);
    const finalToken = await issue(first.id, "REPLACE");
    let cfg = (
      await api<{ config: InvitationConfig }>(
        owner,
        "GET",
        "/api/v1/invitations",
      )
    ).config;
    const configBody = (
      { title, welcomeMessage, story, language, revision }: InvitationConfig,
      published: boolean,
    ) => ({ title, welcomeMessage, story, language, revision, published });
    await api(owner, "POST", "/api/v1/invitations", configBody(cfg, false));
    expect(
      (
        await guest.request.get(`/api/v1/public/invitations/${finalToken}`)
      ).status(),
    ).toBe(410);
    cfg = (
      await api<{ config: InvitationConfig }>(
        owner,
        "GET",
        "/api/v1/invitations",
      )
    ).config;
    await api(owner, "POST", "/api/v1/invitations", configBody(cfg, true));
    await guest.goto(`/invite/${finalToken}`);
    await expect(
      guest.getByRole("heading", { name: "Will you join us?" }),
    ).toBeVisible();
    const invalid = "a".repeat(43);
    tokens.push(invalid);
    expect(
      (
        await guest.request.get(`/api/v1/public/invitations/${invalid}`)
      ).status(),
    ).toBe(410);
    await guest.goto(`/invite/${invalid}`);
    await expect(
      guest.getByRole("heading", { name: "We couldn’t open this invitation" }),
    ).toBeVisible();
    await screenshots(guest, "invalid-invitation");
    const rateGuest = await api<{ id: string }>(
      owner,
      "POST",
      "/api/v1/guests",
      { name: "QA Rate Limit Guest" },
      201,
    );
    const rateToken = await issue(rateGuest.id);
    for (let n = 0; n < 20; n++)
      expect(
        (
          await guest.request.post(
            `/api/v1/public/invitations/${rateToken}/rsvp`,
            { data: {} },
          )
        ).status(),
      ).toBe(400);
    const limited = await guest.request.post(
      `/api/v1/public/invitations/${rateToken}/rsvp`,
      { data: {} },
    );
    expect(limited.status()).toBe(429);
    expect(limited.headers()["retry-after"]).toBe("60");
    linkRow = (await list()).rows.find((r) => r.guestId === first.id)!;
    expect(linkRow.response).toBe("YES");
    expect(String(events.insertedIds[0])).not.toBe(
      String(events.insertedIds[1]),
    );
    console.log("INVITATION_RSVP_EVENT_QA_PASSED");
  } catch (e) {
    await owner
      .screenshot({
        path: info.outputPath("failure-context.png"),
        fullPage: true,
      })
      .catch(() => {});
    throw e;
  } finally {
    const ws = await db
      .collection("weddings")
      .find({ title: { $regex: `^${marker}` } })
      .project({ _id: 1 })
      .toArray();
    const scope = { tenantId: { $in: ws.map((w) => w._id) } };
    for (const name of [
      "invitation_links",
      "invitations",
      "rsvps",
      "guests",
      "guest_families",
      "events",
      "activity_logs",
      "roles",
      "wedding_members",
    ])
      await db.collection(name).deleteMany(scope);
    await db.collection("weddings").deleteMany({
      _id: { $in: ws.map((w) => w._id) },
      title: { $regex: `^${marker}` },
    });
    await db.collection("auth_tokens").deleteMany({ userId: { $in: ids } });
    await db
      .collection("users")
      .deleteMany({ _id: { $in: ids }, email: { $regex: `^${marker}` } });
    const keys = [];
    for (const token of tokens)
      for (
        let minute = startMinute;
        minute <= Math.floor(Date.now() / 60000);
        minute++
      )
        for (const kind of ["read", "write"])
          keys.push(
            createHash("sha256")
              .update(`${kind}:${token}:${minute}`)
              .digest("hex"),
          );
    await db
      .collection<{ _id: string }>("public_rate_limits")
      .deleteMany({ _id: { $in: keys } });
    const remaining = await Promise.all([
      db.collection("users").countDocuments({ _id: { $in: ids } }),
      db
        .collection("weddings")
        .countDocuments({ title: { $regex: `^${marker}` } }),
      db.collection("guests").countDocuments(scope),
      db.collection("invitation_links").countDocuments(scope),
      db.collection("rsvps").countDocuments(scope),
    ]);
    for (const c of contexts) await c.close();
    await conn.close();
    expect(remaining).toEqual([0, 0, 0, 0, 0]);
    console.log("INVITATION_QA_CLEANUP_CONFIRMED");
  }
});
