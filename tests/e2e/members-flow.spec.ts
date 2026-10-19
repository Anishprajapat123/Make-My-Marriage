import { test, expect, type Page } from "@playwright/test";
import mongoose, { Types } from "mongoose";
import argon2 from "argon2";
import { randomUUID, randomBytes, createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";

test("Members: invite, verified acceptance, lifecycle, isolation and responsive views", async ({
  browser,
}, testInfo) => {
  test.setTimeout(300000);
  test.skip(
    process.env.RUN_MEMBERS_LIVE_QA !== "1",
    "Enable explicitly to create temporary development fixtures.",
  );
  try {
    process.loadEnvFile(".env.local");
  } catch {
    /* CI can provide configuration. */
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
    marker = `members-qa-${randomUUID()}`,
    password = `${randomUUID()}Aa1!`;
  const ownerIds = [new Types.ObjectId(), new Types.ObjectId()],
    tenantIds: Types.ObjectId[] = [];
  const contexts = await Promise.all([
    browser.newContext(),
    browser.newContext(),
    browser.newContext(),
  ]);
  const [owner, foreign, invitee] = await Promise.all(
    contexts.map((c) => c.newPage()),
  );
  const email = (n: number) => `${marker}-${n}@example.invalid`;
  let candidateId: Types.ObjectId | undefined;
  async function login(
    page: Page,
    n: number,
    destination = /\/(dashboard|onboarding)$/,
  ) {
    await page.goto("/login");
    await page.getByLabel("Email address", { exact: true }).fill(email(n));
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(destination);
  }
  async function shots(page: Page, label: string) {
    for (const [name, width, height] of [
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
        path: testInfo.outputPath(`${label}-${name}.png`),
        fullPage: true,
      });
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
  }
  async function member(page: Page, id: string) {
    const r = await page.request.get(`/api/v1/members/${id}`);
    expect(r.status()).toBe(200);
    return (await r.json()).data.member;
  }
  async function issue(page: Page, to: string, roles: string[]) {
    const r = await page.request.post("/api/v1/members/invitations", {
      data: { email: to, roleIds: roles },
    });
    expect(r.status()).toBe(201);
    const data = (await r.json()).data;
    expect(data.emailSent).toBe(false);
    return data as { id: string; link: string; expiresAt: string };
  }
  const token = (link: string) => new URL(link).pathname.split("/").pop()!;
  try {
    expect((await owner.request.get("/api/v1/members")).status()).toBe(401);
    const hash = await argon2.hash(password, { type: argon2.argon2id });
    await db.collection("users").insertMany(
      ownerIds.map((_id, n) => ({
        _id,
        email: email(n),
        displayName: `QA Planner ${n}`,
        authProvider: "LOCAL",
        passwordHash: hash,
        emailVerifiedAt: new Date(),
        status: "ACTIVE",
        sessionVersion: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
    );
    for (const [n, page] of [owner, foreign].entries()) {
      await login(page, n);
      const result = await page.request.post("/api/v1/auth/onboarding", {
        data: {
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
      });
      expect(result.status()).toBe(201);
      tenantIds.push(
        new Types.ObjectId(
          (await (await page.request.get("/api/v1/auth/session")).json()).data
            .wedding.id,
        ),
      );
    }
    const roles = (await (await owner.request.get("/api/v1/roles")).json()).data
      .roles as { id: string; key: string }[];
    const roleId = (key: string) => roles.find((r) => r.key === key)!.id;
    const foreignRoles = (
      await (await foreign.request.get("/api/v1/roles")).json()
    ).data.roles;
    const foreignFamily = foreignRoles.find(
      (r: { key: string }) => r.key === "FAMILY_MEMBER",
    ).id;
    const ownerMember = await db
      .collection("wedding_members")
      .findOne({ tenantId: tenantIds[0], userId: ownerIds[0] });
    await owner.goto("/members");
    await expect(
      owner.getByRole("heading", { name: "Wedding members & collaborators" }),
    ).toBeVisible();
    await expect(
      owner.getByText("QA Planner 0 (you)", { exact: true }),
    ).toBeVisible();
    await shots(owner, "owner-only");
    await owner
      .getByRole("button", { name: "Invite collaborator", exact: true })
      .click();
    await owner.getByLabel("Email address", { exact: true }).fill(email(2));
    await owner.getByRole("checkbox", { name: /Family Member/ }).check();
    await owner.getByRole("checkbox", { name: /Photographer/ }).check();
    await shots(owner, "invite-form");
    const issuing = owner.waitForResponse(
      (r) =>
        r.url().endsWith("/api/v1/members/invitations") &&
        r.request().method() === "POST",
    );
    await owner
      .getByRole("button", { name: "Create & email invitation" })
      .click();
    const createdResponse = await issuing;
    expect(createdResponse.status()).toBe(201);
    const created = (await createdResponse.json()).data;
    await expect(
      owner.getByRole("status").filter({ hasText: "email delivery failed" }),
    ).toBeVisible();
    await owner.getByRole("button", { name: "Dismiss link" }).click();
    const stored = await db
      .collection("member_invitations")
      .findOne({ _id: new Types.ObjectId(created.id), tenantId: tenantIds[0] });
    expect(stored!.tokenHash).toBe(
      createHash("sha256").update(token(created.link)).digest("hex"),
    );
    expect(stored!.token).toBeUndefined();
    expect(stored!.roleIds).toHaveLength(2);
    expect(
      (
        await owner.request.post("/api/v1/members/invitations", {
          data: { email: email(2), roleIds: [roleId("FAMILY_MEMBER")] },
        })
      ).status(),
    ).toBe(409);
    expect(
      (
        await owner.request.post("/api/v1/members/invitations", {
          data: { email: email(3), roleIds: [foreignFamily] },
        })
      ).status(),
    ).toBe(400);
    expect(
      (
        await owner.request.patch(`/api/v1/members/${ownerMember!._id}`, {
          data: {
            status: "REMOVED",
            updatedAt: ownerMember!.updatedAt.toISOString(),
          },
        })
      ).status(),
    ).toBe(403);
    expect(
      (
        await foreign.request.get(`/api/v1/members/${ownerMember!._id}`)
      ).status(),
    ).toBe(404);
    await invitee.goto(created.link);
    await expect(invitee).toHaveURL(/\/join$/);
    await expect(
      invitee.getByRole("link", { name: "Create account" }),
    ).toBeVisible();
    await expect(invitee.getByText(`${marker}-0`)).toHaveCount(0);
    await shots(invitee, "anonymous-join");
    const cookie = (await contexts[2].cookies()).find(
      (c) => c.name === "mmm-member-invitation",
    );
    expect(cookie?.httpOnly).toBe(true);
    await invitee.getByRole("link", { name: "Create account" }).click();
    await invitee
      .getByLabel("Your name", { exact: true })
      .fill("QA Collaborator");
    await invitee.getByLabel("Email address", { exact: true }).fill(email(2));
    await invitee
      .getByLabel("Create a password", { exact: true })
      .fill(password);
    await invitee
      .getByRole("button", { name: "Create account", exact: true })
      .click();
    await expect(
      invitee
        .getByRole("status")
        .filter({ hasText: "verification instructions" }),
    ).toBeVisible();
    const candidate = await db.collection("users").findOne({ email: email(2) });
    candidateId = candidate!._id;
    expect(candidate!.emailVerifiedAt).toBeNull();
    await invitee.goto("/login");
    await invitee.getByLabel("Email address", { exact: true }).fill(email(2));
    await invitee.getByLabel("Password", { exact: true }).fill(password);
    await invitee.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(
      invitee.getByRole("alert").filter({ hasText: "verify your email" }),
    ).toBeVisible();
    // Simulate the verification email's bearer token without sending mail for QA accounts.
    const verification = randomBytes(32).toString("base64url");
    await db.collection("auth_tokens").updateOne(
      { userId: candidateId, purpose: "EMAIL_VERIFICATION" },
      {
        $set: {
          tokenHash: createHash("sha256").update(verification).digest("hex"),
          expiresAt: new Date(Date.now() + 3600000),
        },
      },
      { upsert: true },
    );
    await invitee.goto(`/verify-email?token=${verification}`);
    await invitee
      .getByRole("button", { name: "Verify email", exact: true })
      .click();
    await expect(
      invitee.getByRole("status").filter({ hasText: /verified/i }),
    ).toBeVisible();
    await login(invitee, 2, /\/join$/);
    await expect(
      invitee.getByRole("button", { name: "Accept invitation", exact: true }),
    ).toBeVisible();
    await shots(invitee, "authenticated-join");
    await invitee
      .getByRole("button", { name: "Accept invitation", exact: true })
      .click();
    await expect(
      invitee.getByRole("heading", { name: "You’re part of the team." }),
    ).toBeVisible();
    await invitee.getByRole("link", { name: "Open wedding workspace" }).click();
    await expect(invitee).toHaveURL(/\/dashboard$/);
    const membership = await db
      .collection("wedding_members")
      .findOne({ tenantId: tenantIds[0], userId: candidateId });
    const memberId = String(membership!._id);
    expect(membership!.roleIds).toHaveLength(2);
    expect(
      (
        await invitee.request.post(
          `/api/v1/members/invitations/${token(created.link)}/accept`,
          { data: {} },
        )
      ).status(),
    ).toBe(200);
    expect((await invitee.request.get("/api/v1/members")).status()).toBe(403);
    await invitee.goto("/members");
    await expect(
      invitee.getByRole("heading", {
        name: "Member management access required",
      }),
    ).toBeVisible();
    await shots(invitee, "access-denied");
    await owner.goto("/members");
    await expect(
      owner.getByText("QA Collaborator", { exact: true }),
    ).toBeVisible();
    await shots(owner, "populated-members");
    await owner
      .getByLabel("Search members", { exact: true })
      .fill("no-such-qa-member");
    await expect(
      owner.getByRole("heading", { name: "No matching members" }),
    ).toBeVisible();
    await shots(owner, "no-results");
    await owner.getByRole("button", { name: "Clear filters" }).click();
    await expect(
      owner.getByText("QA Collaborator", { exact: true }),
    ).toBeVisible();
    await owner.route(/\/api\/v1\/members\?/, (route) =>
      route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({
          success: false,
          error: { message: "QA team fetch unavailable" },
        }),
      }),
    );
    await owner.reload();
    await expect(
      owner.getByRole("alert").filter({ hasText: "QA team fetch unavailable" }),
    ).toBeVisible();
    await shots(owner, "fetch-error");
    await owner.unroute(/\/api\/v1\/members\?/);
    await owner.getByRole("button", { name: "Try again", exact: true }).click();
    await expect(
      owner.getByText("QA Collaborator", { exact: true }),
    ).toBeVisible();
    await owner
      .getByRole("button", { name: "Manage access", exact: true })
      .click();
    await shots(owner, "manage-access");
    await owner.getByRole("button", { name: "Cancel", exact: true }).click();
    let current = await member(owner, memberId);
    const stale = current.updatedAt;
    await owner
      .getByRole("button", { name: "Manage access", exact: true })
      .click();
    expect(
      (
        await owner.request.patch(`/api/v1/members/${memberId}`, {
          data: { status: "SUSPENDED", updatedAt: current.updatedAt },
        })
      ).status(),
    ).toBe(200);
    expect((await invitee.request.get("/api/v1/tasks")).status()).toBe(403);
    expect(
      (
        await invitee.request.post(
          `/api/v1/members/invitations/${token(created.link)}/accept`,
          { data: {} },
        )
      ).status(),
    ).toBe(410);
    expect(
      (
        await owner.request.patch(`/api/v1/members/${memberId}`, {
          data: { status: "ACTIVE", updatedAt: stale },
        })
      ).status(),
    ).toBe(409);
    await owner
      .getByRole("button", { name: "Review changes", exact: true })
      .click();
    await owner
      .getByRole("button", { name: "Confirm access change", exact: true })
      .click();
    await expect(
      owner.getByRole("alert").filter({ hasText: "This member changed" }),
    ).toBeVisible();
    await shots(owner, "stale-edit");
    await owner
      .getByRole("button", {
        name: "Reload members — discard edits",
        exact: true,
      })
      .click();
    current = await member(owner, memberId);
    expect(
      (
        await owner.request.patch(`/api/v1/members/${memberId}`, {
          data: {
            status: "ACTIVE",
            roleIds: [roleId("FAMILY_ADMIN")],
            updatedAt: current.updatedAt,
          },
        })
      ).status(),
    ).toBe(200);
    expect(
      (
        await invitee.request.post("/api/v1/members/invitations", {
          data: { email: email(8), roleIds: [roleId("OWNER")] },
        })
      ).status(),
    ).toBe(403);
    expect(
      (
        await invitee.request.post("/api/v1/members/invitations", {
          data: { email: email(8), roleIds: [roleId("FINANCE_MANAGER")] },
        })
      ).status(),
    ).toBe(403);
    current = await member(owner, memberId);
    expect(
      (
        await invitee.request.patch(`/api/v1/members/${memberId}`, {
          data: { status: "REMOVED", updatedAt: current.updatedAt },
        })
      ).status(),
    ).toBe(403);
    expect(
      (
        await foreign.request.patch(`/api/v1/members/${memberId}`, {
          data: { status: "REMOVED", updatedAt: current.updatedAt },
        })
      ).status(),
    ).toBe(409);
    expect(
      (
        await owner.request.delete(`/api/v1/members/${memberId}`, {
          data: { updatedAt: current.updatedAt },
        })
      ).status(),
    ).toBe(200);
    expect((await invitee.request.get("/api/v1/tasks")).status()).toBe(403);
    const rejoin = await issue(owner, email(2), [roleId("FAMILY_MEMBER")]);
    await invitee.goto(rejoin.link);
    await expect(
      invitee.getByRole("button", { name: "Accept invitation", exact: true }),
    ).toBeVisible();
    await invitee
      .getByRole("button", { name: "Accept invitation", exact: true })
      .click();
    await expect(
      invitee.getByRole("heading", { name: "You’re part of the team." }),
    ).toBeVisible();
    expect(
      String(
        (await db
          .collection("wedding_members")
          .findOne({ tenantId: tenantIds[0], userId: candidateId }))!._id,
      ),
    ).toBe(memberId);
    const another = await issue(owner, email(1), [roleId("FAMILY_MEMBER")]);
    expect(
      (
        await foreign.request.post(
          `/api/v1/members/invitations/${token(another.link)}/accept`,
          { data: {} },
        )
      ).status(),
    ).toBe(409);
    expect(
      (
        await foreign.request.post(
          `/api/v1/members/invitations/${token(created.link)}/accept`,
          { data: {} },
        )
      ).status(),
    ).toBe(403);
    const history = (
      await (await owner.request.get("/api/v1/members/invitations")).json()
    ).data.invitations;
    const pending = history.find((i: { id: string }) => i.id === another.id);
    expect(
      (
        await owner.request.patch(`/api/v1/members/invitations/${another.id}`, {
          data: { action: "REVOKE", updatedAt: pending.updatedAt },
        })
      ).status(),
    ).toBe(200);
    expect(
      (
        await foreign.request.post(
          `/api/v1/members/invitations/${token(another.link)}/accept`,
          { data: {} },
        )
      ).status(),
    ).toBe(410);
    const revoked = (
      await (await owner.request.get("/api/v1/members/invitations")).json()
    ).data.invitations.find((i: { id: string }) => i.id === another.id);
    const replacedResponse = await owner.request.patch(
      `/api/v1/members/invitations/${another.id}`,
      { data: { action: "REPLACE", updatedAt: revoked.updatedAt } },
    );
    expect(replacedResponse.status()).toBe(200);
    const replacement = (await replacedResponse.json()).data;
    await db
      .collection("member_invitations")
      .updateOne(
        { _id: new Types.ObjectId(replacement.id), tenantId: tenantIds[0] },
        { $set: { expiresAt: new Date(Date.now() - 1000) } },
      );
    expect(
      (
        await foreign.request.post(
          `/api/v1/members/invitations/${token(replacement.link)}/accept`,
          { data: {} },
        )
      ).status(),
    ).toBe(410);
    await owner.goto("/members");
    await owner
      .getByRole("button", { name: "Invitations", exact: true })
      .click();
    await expect(owner.getByText("revoked", { exact: true })).toBeVisible();
    await shots(owner, "invitation-history");
    if (process.env.RUN_REAL_SES_MEMBER_QA === "1") {
      const real = await issue(owner, "anishprajapat924@gmail.com", [
        roleId("FAMILY_MEMBER"),
      ]);
      const ses = new SESv2Client({ region: process.env.AWS_REGION });
      const credentials = await ses.config.credentials();
      const identityResult = spawnSync(
        "aws",
        ["sts", "get-caller-identity", "--output", "json"],
        {
          encoding: "utf8",
          env: {
            ...process.env,
            AWS_ACCESS_KEY_ID: credentials.accessKeyId,
            AWS_SECRET_ACCESS_KEY: credentials.secretAccessKey,
            AWS_SESSION_TOKEN: credentials.sessionToken ?? "",
          },
        },
      );
      if (identityResult.status !== 0)
        throw Error(
          "AWS identity could not be verified; real email was not sent.",
        );
      const identity = JSON.parse(identityResult.stdout);
      if (
        identity.Account !== "291786456658" ||
        identity.Arn !== "arn:aws:iam::291786456658:user/anish-dev"
      )
        throw Error("AWS identity mismatch; real email was not sent.");
      try {
        await ses.send(
          new SendEmailCommand({
            FromEmailAddress: process.env.SES_FROM_EMAIL,
            Destination: { ToAddresses: ["anishprajapat924@gmail.com"] },
            Content: {
              Simple: {
                Subject: {
                  Data: "Make My Marriage — one QA invitation test",
                  Charset: "UTF-8",
                },
                Body: {
                  Text: {
                    Data: `This is the one invitation test you approved. No action is needed. The temporary QA wedding will be deleted after verification and this link will then be invalid.\n\n${real.link}`,
                    Charset: "UTF-8",
                  },
                },
              },
            },
          }),
        );
        console.log("REAL_SES_TEST_ACCEPTED");
      } catch (e) {
        console.log(
          `REAL_SES_TEST_FAILED:${e instanceof Error ? e.name : "UnknownError"}`,
        );
        throw Error(
          "The approved SES test email was rejected; no automatic retry was sent.",
        );
      }
    }
    current = await member(owner, memberId);
    await owner.request.delete(`/api/v1/members/${memberId}`, {
      data: { updatedAt: current.updatedAt },
    });
    const [raceA, raceB] = await Promise.all([
      issue(owner, email(2), [roleId("FAMILY_MEMBER")]),
      issue(foreign, email(2), [foreignFamily]),
    ]);
    const results = await Promise.all(
      [raceA, raceB].map((invitation) =>
        invitee.request.post(
          `/api/v1/members/invitations/${token(invitation.link)}/accept`,
          { data: {} },
        ),
      ),
    );
    expect(results.map((r) => r.status()).sort()).toEqual([200, 409]);
    expect(
      await db.collection("wedding_members").countDocuments({
        userId: candidateId,
        membershipStatus: { $in: ["ACTIVE", "SUSPENDED"] },
      }),
    ).toBe(1);
  } finally {
    const users = await db
      .collection("users")
      .find({ email: { $regex: `^${marker}` } })
      .project({ _id: 1 })
      .toArray();
    const ids = users.map((u) => u._id);
    const memberships = await db
      .collection("wedding_members")
      .find({ userId: { $in: ids } })
      .project({ tenantId: 1 })
      .toArray();
    const tenants = [...tenantIds, ...memberships.map((m) => m.tenantId)];
    for (const collection of [
      "tasks",
      "task_comments",
      "activity_logs",
      "events",
      "roles",
      "member_invitations",
      "wedding_members",
    ])
      await db
        .collection(collection)
        .deleteMany({ tenantId: { $in: tenants } });
    await db
      .collection("weddings")
      .deleteMany({ _id: { $in: tenants }, title: { $regex: `^${marker}` } });
    await db.collection("auth_tokens").deleteMany({ userId: { $in: ids } });
    await db
      .collection("users")
      .deleteMany({ _id: { $in: ids }, email: { $regex: `^${marker}` } });
    for (const context of contexts) await context.close();
    await conn.close();
  }
});
