import { test, expect, type Page } from "@playwright/test";
import mongoose, { Types } from "mongoose";
import argon2 from "argon2";
import { randomBytes, randomUUID } from "node:crypto";
import type {
  ExpenseList,
  ExpenseSummary,
  ExpenseView,
} from "../../modules/expenses/expense.types";
test("Deployed Expenses: custom categories, payment protection, access and mobile", async ({
  browser,
}, info) => {
  test.setTimeout(600000);
  test.skip(
    process.env.RUN_EXPENSES_LIVE_QA !== "1",
    "Opt in to temporary live demo fixtures.",
  );
  try {
    process.loadEnvFile(".env.local");
  } catch {
    /* CI environment */
  }
  if (!process.env.MONGODB_URI) throw Error("QA database is not configured.");
  const connection = mongoose.createConnection(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 15000,
  });
  try {
    await connection.asPromise();
  } catch {
    throw Error("QA database connection failed.");
  }
  const db = connection.db!,
    marker = `expenses-qa-${randomUUID()}`,
    password = randomBytes(24).toString("base64url");
  const ids = Array.from({ length: 5 }, () => new Types.ObjectId()),
    tenantIds: Types.ObjectId[] = [];
  const contexts = await Promise.all(ids.map(() => browser.newContext()));
  const pages = await Promise.all(contexts.map((context) => context.newPage()));
  const [owner, foreign, reader, family, finance] = pages;
  for (const page of pages) page.setDefaultTimeout(20000);
  async function api<T = unknown>(
    page: Page,
    method: string,
    path: string,
    data?: unknown,
    status = 200,
  ): Promise<T> {
    const response = await page.request.fetch(path, {
      method,
      ...(data === undefined ? {} : { data }),
      timeout: 45000,
    });
    expect(response.status(), `${method} ${path}`).toBe(status);
    const body = await response.json();
    return body.data as T;
  }
  const email = (n: number) => `${marker}-${n}@example.invalid`;
  async function login(page: Page, n: number) {
    await page.goto("/login");
    await page.getByLabel("Email address", { exact: true }).fill(email(n));
    await page.getByLabel("Password", { exact: true }).fill(password);
    const callback = page.waitForResponse(
      (response) => response.url().includes("/api/auth/callback/credentials"),
      { timeout: 45000 },
    );
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    const response = await callback;
    const result = await response.json();
    expect(
      result.url
        ? new URL(result.url).searchParams.get("error")
        : "MISSING_CALLBACK_URL",
      "Credentials callback error code",
    ).toBeNull();
    await expect(page).toHaveURL(/\/(onboarding|dashboard)$/, {
      timeout: 30000,
    });
  }
  async function list(page = owner, query = "") {
    return api<ExpenseList>(page, "GET", `/api/v1/expenses${query}`);
  }
  const detail = (id: string, page = owner) =>
    api<ExpenseView>(page, "GET", `/api/v1/expenses/${id}`);
  const summary = () =>
    api<ExpenseSummary>(owner, "GET", "/api/v1/expenses/summary");
  async function images(page: Page, label: string) {
    for (const [device, width, height] of [
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
        path: info.outputPath(`${label}-${device}.png`),
        fullPage: true,
      });
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
  }
  const initial = {
    title: "QA Custom Flowers",
    amount: "100.10",
    category: "Art & Craft / DIY",
    financialState: "COMMITTED",
  };
  try {
    const hash = await argon2.hash(password, { type: argon2.argon2id });
    await db.collection("users").insertMany(
      ids.map((_id, n) => ({
        _id,
        email: email(n),
        displayName: `Expense QA ${n}`,
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
      await api(
        page,
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
      const session = await api<{ wedding: { id: string } }>(
        page,
        "GET",
        "/api/v1/auth/session",
      );
      tenantIds.push(new Types.ObjectId(session.wedding.id));
    }
    for (const [n, key] of [
      [2, "FAMILY_ADMIN"],
      [3, "FAMILY_MEMBER"],
      [4, "FINANCE_MANAGER"],
    ] as const) {
      const role = await db
        .collection("roles")
        .findOne({ tenantId: tenantIds[0], key, isSystemRole: true });
      if (!role) throw Error("QA role was not created.");
      await db.collection("wedding_members").insertOne({
        tenantId: tenantIds[0],
        userId: ids[n],
        roleIds: [role._id],
        membershipStatus: "ACTIVE",
        joinedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await login(pages[n], n);
    }
    const anonymous = await browser.newContext();
    contexts.push(anonymous);
    expect((await anonymous.request.get("/api/v1/expenses")).status()).toBe(
      401,
    );
    await owner.goto("/expenses");
    await expect(
      owner.getByRole("heading", { name: "Start your wedding ledger" }),
    ).toBeVisible();
    await images(owner, "empty-ledger");
    await owner
      .getByRole("button", { name: "Add expense", exact: true })
      .first()
      .click();
    let dialog = owner.getByRole("dialog");
    await dialog
      .getByLabel("Expense title", { exact: true })
      .fill(initial.title);
    await dialog
      .getByLabel("Amount (INR)", { exact: true })
      .fill(initial.amount);
    await dialog.getByLabel(/^Category/).fill(initial.category);
    await dialog
      .getByRole("combobox", { name: /^Financial state/ })
      .selectOption("COMMITTED");
    expect(
      await dialog
        .locator("#expense-category-suggestions option")
        .evaluateAll((options) =>
          options.map((option) => (option as HTMLOptionElement).value),
        ),
    ).not.toContain(initial.category);
    await images(owner, "custom-expense-form");
    await dialog
      .getByRole("button", { name: "Save expense", exact: true })
      .click();
    await expect(dialog).toBeHidden();
    await expect(
      owner.getByRole("button", { name: initial.title, exact: true }),
    ).toBeVisible();
    let current = (await list()).expenses[0];
    const expenseId = current.id;
    expect(current.category).toBe(initial.category);
    expect(
      (
        await list(
          owner,
          `?category=${encodeURIComponent(initial.category.toLowerCase())}`,
        )
      ).total,
    ).toBe(1);
    expect((await list(owner, "?category=Art.*")).total).toBe(0);
    const create = {
      requestId: randomUUID(),
      expense: {
        title: "QA Small Estimate",
        amount: "0.20",
        category: "Venue",
        financialState: "ESTIMATED",
      },
    };
    const created = await api<{ id: string }>(
      owner,
      "POST",
      "/api/v1/expenses",
      create,
      201,
    );
    expect(
      await api(owner, "POST", "/api/v1/expenses", create, 201),
    ).toMatchObject({ id: created.id });
    await api(
      owner,
      "POST",
      "/api/v1/expenses",
      { ...create, expense: { ...create.expense, amount: "0.30" } },
      409,
    );
    expect((await detail(created.id)).category).toBe("VENUE");
    expect(await summary()).toMatchObject({
      estimated: "0.20",
      committed: "100.10",
      paid: "0.00",
      recorded: "100.30",
      budget: null,
    });
    for (const extra of [
      { tenantId: String(tenantIds[1]) },
      { financialState: "PAID" },
      { amount: "1.001" },
      { category: "a".repeat(81) },
    ])
      await api(
        owner,
        "POST",
        "/api/v1/expenses",
        { requestId: randomUUID(), expense: { ...initial, ...extra } },
        400,
      );
    const foreignEvent = new Types.ObjectId();
    await db.collection("events").insertOne({
      _id: foreignEvent,
      tenantId: tenantIds[1],
      name: "QA foreign event",
      startAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await api(
      owner,
      "POST",
      "/api/v1/expenses",
      {
        requestId: randomUUID(),
        expense: { ...initial, eventId: String(foreignEvent) },
      },
      400,
    );
    const foreignMember = await db
      .collection("wedding_members")
      .findOne({ tenantId: tenantIds[1], userId: ids[1] });
    await api(
      owner,
      "POST",
      "/api/v1/expenses",
      {
        requestId: randomUUID(),
        expense: { ...initial, paidByMemberId: String(foreignMember!._id) },
      },
      400,
    );
    await owner.reload();
    await expect(
      owner.getByRole("button", { name: initial.title, exact: true }),
    ).toBeVisible();
    let row = owner
      .getByRole("list", { name: "Expenses", exact: true })
      .locator("li")
      .filter({
        has: owner.getByRole("button", { name: initial.title, exact: true }),
      });
    await row.getByRole("button", { name: "Edit", exact: true }).click();
    dialog = owner.getByRole("dialog");
    await expect(dialog.getByLabel(/^Category/)).toHaveValue(initial.category);
    await dialog.getByLabel("Amount (INR)", { exact: true }).fill("100.20");
    await dialog.getByLabel(/^Category/).fill("Family DIY");
    await dialog
      .getByRole("button", { name: "Save expense", exact: true })
      .click();
    await expect(dialog).toBeHidden();
    await api(
      owner,
      "PATCH",
      `/api/v1/expenses/${expenseId}`,
      { revision: current.revision, expense: initial },
      409,
    );
    current = await detail(expenseId);
    expect(current.amount).toBe("100.20");
    await row.getByRole("button", { name: "Edit", exact: true }).click();
    dialog = owner.getByRole("dialog");
    await dialog
      .getByLabel("Expense title", { exact: true })
      .fill("QA retained draft");
    await owner.route(`**/api/v1/expenses/${expenseId}`, (route) =>
      route.request().method() === "PATCH"
        ? route.fulfill({
            status: 503,
            contentType: "application/json",
            body: JSON.stringify({
              success: false,
              error: {
                code: "SERVICE_UNAVAILABLE",
                message: "QA simulated save failure",
              },
            }),
          })
        : route.continue(),
    );
    await dialog
      .getByRole("button", { name: "Save expense", exact: true })
      .click();
    await expect(dialog.getByRole("alert")).toContainText(
      "QA simulated save failure",
    );
    await expect(
      dialog.getByLabel("Expense title", { exact: true }),
    ).toHaveValue("QA retained draft");
    await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
    await owner.unroute(`**/api/v1/expenses/${expenseId}`);
    await reader.goto("/expenses");
    await expect(
      reader.getByRole("button", { name: initial.title, exact: true }),
    ).toBeVisible();
    await expect(
      reader.getByRole("button", { name: "Add expense", exact: true }),
    ).toHaveCount(0);
    await expect(
      reader.getByRole("button", { name: "Record payment", exact: true }),
    ).toHaveCount(0);
    await images(reader, "readonly-ledger");
    await api(
      reader,
      "PATCH",
      `/api/v1/expenses/${expenseId}`,
      { revision: current.revision, expense: initial },
      403,
    );
    await api(
      reader,
      "DELETE",
      `/api/v1/expenses/${expenseId}`,
      { revision: current.revision },
      403,
    );
    await api(
      reader,
      "POST",
      `/api/v1/expenses/${expenseId}/payments`,
      {},
      403,
    );
    for (const path of [
      "/api/v1/expenses",
      "/api/v1/expenses/summary",
      "/api/v1/expenses/options",
      `/api/v1/expenses/${expenseId}`,
    ])
      await api(family, "GET", path, undefined, 403);
    await family.goto("/expenses");
    await expect(
      family.getByRole("heading", { name: "Expenses access restricted" }),
    ).toBeVisible();
    await expect(family.getByText(initial.title)).toHaveCount(0);
    await images(family, "denied-ledger");
    await api(foreign, "GET", `/api/v1/expenses/${expenseId}`, undefined, 404);
    await api(
      foreign,
      "PATCH",
      `/api/v1/expenses/${expenseId}`,
      { revision: current.revision, expense: initial },
      404,
    );
    await api(
      foreign,
      "POST",
      `/api/v1/expenses/${expenseId}/payments`,
      {
        requestId: randomUUID(),
        revision: current.revision,
        amount: "100.20",
        paidLocal: "2026-01-01T12:00",
        method: "CASH",
      },
      404,
    );
    await api(
      finance,
      "POST",
      `/api/v1/expenses/${expenseId}/payments`,
      {
        requestId: randomUUID(),
        revision: current.revision,
        amount: "1.00",
        paidLocal: "2026-01-01T12:00",
        method: "CASH",
      },
      400,
    );
    await api(
      finance,
      "POST",
      `/api/v1/expenses/${expenseId}/payments`,
      {
        requestId: randomUUID(),
        revision: current.revision,
        amount: "100.20",
        paidLocal: "2099-01-01T12:00",
        method: "CASH",
      },
      400,
    );
    await finance.goto("/expenses");
    await expect(
      finance.getByRole("button", { name: initial.title, exact: true }),
    ).toBeVisible();
    const financeRow = finance
      .getByRole("list", { name: "Expenses", exact: true })
      .locator("li")
      .filter({
        has: finance.getByRole("button", { name: initial.title, exact: true }),
      });
    await financeRow
      .getByRole("button", { name: "Record payment", exact: true })
      .click();
    const paymentDialog = finance.getByRole("dialog");
    await expect(paymentDialog).toContainText("transfers no money");
    await paymentDialog.getByRole("checkbox").check();
    await images(finance, "payment-confirmation");
    const paymentRequest = finance.waitForRequest(
      (request) =>
        request.method() === "POST" &&
        request.url().endsWith(`/api/v1/expenses/${expenseId}/payments`),
    );
    await paymentDialog
      .getByRole("button", { name: "Confirm full payment", exact: true })
      .click();
    const paymentBody = (await paymentRequest).postDataJSON();
    await expect(paymentDialog).toBeHidden();
    await expect(financeRow.getByText("Paid", { exact: true })).toBeVisible();
    current = await detail(expenseId);
    expect(current.financialState).toBe("PAID");
    expect(current.payment?.amount).toBe("100.20");
    expect(JSON.stringify(current)).not.toMatch(
      /requestId|requestHash|recordedByMemberId|tenantId/,
    );
    await api(
      finance,
      "POST",
      `/api/v1/expenses/${expenseId}/payments`,
      paymentBody,
    );
    await api(
      finance,
      "POST",
      `/api/v1/expenses/${expenseId}/payments`,
      { ...paymentBody, notes: "changed reuse" },
      409,
    );
    await api(
      owner,
      "PATCH",
      `/api/v1/expenses/${expenseId}`,
      { revision: current.revision, expense: initial },
      409,
    );
    await api(
      owner,
      "DELETE",
      `/api/v1/expenses/${expenseId}`,
      { revision: current.revision },
      409,
    );
    expect(await summary()).toMatchObject({
      committed: "0.00",
      paid: "100.20",
      estimated: "0.20",
      recorded: "100.40",
    });
    await expect(
      financeRow.getByRole("button", { name: "Edit", exact: true }),
    ).toHaveCount(0);
    await expect(
      financeRow.getByRole("button", { name: "Archive", exact: true }),
    ).toHaveCount(0);
    await financeRow
      .getByRole("button", { name: "Details", exact: true })
      .click();
    await expect(finance.getByRole("dialog")).toContainText(
      "Full payment recorded",
    );
    await images(finance, "paid-details");
    await finance.getByRole("button", { name: "Close expense dialog" }).click();
    await images(finance, "paid-ledger");
    const small = await detail(created.id);
    await api(owner, "DELETE", `/api/v1/expenses/${small.id}`, {
      revision: small.revision,
    });
    expect(await summary()).toMatchObject({
      estimated: "0.00",
      paid: "100.20",
    });
    const archived = await detail(small.id);
    expect(archived.status).toBe("ARCHIVED");
    await api(
      owner,
      "PATCH",
      `/api/v1/expenses/${small.id}`,
      { revision: archived.revision, expense: create.expense },
      409,
    );
    await api(owner, "POST", `/api/v1/expenses/${small.id}/restore`, {
      revision: archived.revision,
    });
    await api(
      owner,
      "POST",
      `/api/v1/expenses/${small.id}/restore`,
      { revision: archived.revision },
      409,
    );
    const ownerMember = await db
      .collection("wedding_members")
      .findOne({ tenantId: tenantIds[0], userId: ids[0] });
    await db.collection("expenses").insertMany(
      Array.from({ length: 24 }, (_, n) => ({
        tenantId: tenantIds[0],
        createdByMemberId: ownerMember!._id,
        title: n === 23 ? "QA Last Page Expense" : `QA Pagination ${n}`,
        category: "MISCELLANEOUS",
        amount: Types.Decimal128.fromString(n === 23 ? "999.00" : "1.00"),
        currency: "INR",
        financialState: "ESTIMATED",
        eventId: null,
        paidByMemberId: null,
        paidByName: "",
        dueAt: null,
        notes: "",
        status: "ACTIVE",
        revision: 0,
        payment: null,
        requestId: randomUUID(),
        requestHash: "qa-fixture",
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
    );
    await owner.goto("/expenses");
    await owner
      .getByRole("combobox", { name: /^Sort/ })
      .selectOption("AMOUNT_ASC");
    await expect(owner.getByText(/Page 1 of 2/)).toBeVisible();
    await owner.getByRole("button", { name: "Next", exact: true }).click();
    await expect(owner.getByText(/Page 2 of 2/)).toBeVisible();
    row = owner
      .getByRole("list", { name: "Expenses", exact: true })
      .locator("li")
      .filter({
        has: owner.getByRole("button", {
          name: "QA Last Page Expense",
          exact: true,
        }),
      });
    await row.getByRole("button", { name: "Archive", exact: true }).click();
    await owner
      .getByRole("dialog")
      .getByRole("button", { name: "Confirm archive", exact: true })
      .click();
    await expect(owner.getByText(/Page 1 of 1/)).toBeVisible();
    await images(owner, "paginated-ledger");
    await db
      .collection("wedding_members")
      .updateOne(
        { tenantId: tenantIds[0], userId: ids[2] },
        { $set: { membershipStatus: "SUSPENDED" } },
      );
    await api(reader, "GET", "/api/v1/expenses", undefined, 403);
    console.log("LIVE_EXPENSES_QA_PASSED");
  } catch (error) {
    await owner
      .screenshot({
        path: info.outputPath("failure-context.png"),
        fullPage: true,
      })
      .catch(() => {});
    throw error;
  } finally {
    try {
      for (const collection of [
        "expenses",
        "events",
        "activity_logs",
        "roles",
        "wedding_members",
      ])
        await db
          .collection(collection)
          .deleteMany({ tenantId: { $in: tenantIds } });
      await db.collection("auth_tokens").deleteMany({ userId: { $in: ids } });
      await db
        .collection("users")
        .deleteMany({ _id: { $in: ids }, email: { $regex: `^${marker}-` } });
      await db.collection("weddings").deleteMany({
        _id: { $in: tenantIds },
        title: { $regex: `^${marker}-` },
      });
      const remaining = await Promise.all([
        db.collection("users").countDocuments({ _id: { $in: ids } }),
        db.collection("weddings").countDocuments({ _id: { $in: tenantIds } }),
        db
          .collection("expenses")
          .countDocuments({ tenantId: { $in: tenantIds } }),
      ]);
      expect(remaining).toEqual([0, 0, 0]);
      console.log("EXPENSES_QA_CLEANUP_CONFIRMED");
    } finally {
      await Promise.all(contexts.map((context) => context.close()));
      await connection.close();
    }
  }
});
