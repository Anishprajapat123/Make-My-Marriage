import { test, expect } from "@playwright/test";

test("verified login, workspace, events, timeline, responsive views, and sign-out", async ({
  page,
}, testInfo) => {
  test.setTimeout(180000);
  const email = process.env.TEST_LOGIN_EMAIL,
    password = process.env.TEST_LOGIN_PASSWORD;
  test.skip(
    !email || !password,
    "Set TEST_LOGIN_EMAIL and TEST_LOGIN_PASSWORD locally; never commit credentials.",
  );
  const title = `Disposable QA event ${Date.now()}`;
  let eventId: string | undefined;
  const screenshot = async (label: string) => {
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
  };
  await page.goto("/events");
  await expect(page).toHaveURL(/\/login/);
  await screenshot("login");
  for (const route of [
    "register",
    "forgot-password",
    "verify-email",
    "reset-password",
  ]) {
    await page.goto(`/${route}`);
    await screenshot(route);
  }
  for (const [route, data] of [
    ["register", { displayName: "x", email: "invalid", password: "x" }],
    ["verify-email", { token: "invalid" }],
    ["password/reset", { token: "invalid", password: "invalid" }],
  ] as const) {
    expect(
      (await page.request.post(`/api/v1/auth/${route}`, { data })).status(),
    ).toBe(400);
  }
  await page.goto("/login");
  await page.getByLabel("Email address", { exact: true }).fill(email!);
  await page
    .getByLabel("Password", { exact: true })
    .fill("invalid-test-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "couldn’t sign you in" }),
  ).toBeVisible();
  await page.getByLabel("Password", { exact: true }).fill(password!);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/(dashboard|onboarding)/);
  expect(
    page.url(),
    "Complete real wedding onboarding before running the Events journey.",
  ).toContain("/dashboard");
  const session = await page.request.get("/api/v1/auth/session");
  expect(session.status()).toBe(200);
  expect((await session.json()).data.wedding).toBeTruthy();
  // Existing membership must reject a second wedding without altering the first.
  const duplicate = await page.request.post("/api/v1/auth/onboarding", {
    data: {
      wedding: {
        brideName: "QA",
        groomName: "QA",
        title: "Must not be created",
        weddingDate: "2026-12-01",
        city: "Jaipur",
        timezone: "Asia/Kolkata",
        language: "en",
      },
    },
  });
  expect(duplicate.status()).toBe(409);
  await screenshot("dashboard");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByLabel("Open workspace navigation").click();
  await page.getByRole("link", { name: "Events", exact: true }).click();
  await expect(page).toHaveURL(/\/events$/);
  await page.goto("/events");
  await expect(
    page.getByRole("heading", { name: "Events", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Loading your celebration…")).toHaveCount(0);
  await screenshot("events-list");
  try {
    await page.goto("/events/new");
    await expect(
      page.getByRole("heading", { name: "Create event", exact: true }),
    ).toBeVisible();
    await screenshot("event-form");
    for (const [label, value] of [
      ["Event name *", title],
      ["Start date *", "2026-12-01"],
      ["Start time *", "19:30"],
      ["End date (optional)", "2026-12-02"],
      ["End time (optional)", "00:30"],
      ["Venue name *", "Disposable QA venue"],
      ["Address *", "Test address"],
      ["City *", "Jaipur"],
    ])
      await page.getByLabel(label, { exact: true }).fill(value);
    await page.getByLabel("Event status *").selectOption("PUBLISHED");
    await page
      .getByText("Optional venue & guest details", { exact: true })
      .click();
    await page
      .getByLabel("Dress code (optional)", { exact: true })
      .fill("Disposable QA dress code");
    await page
      .getByText("Optional venue & guest details", { exact: true })
      .click();
    await page.getByLabel("Event name *", { exact: true }).press("Enter");
    await expect(page).toHaveURL(/\/events\/[a-f0-9]{24}$/);
    eventId = page.url().split("/").pop();
    await page.goto("/events");
    await expect(
      page.getByRole("heading", { name: title, exact: true }),
    ).toBeVisible();
    await screenshot("events-populated");
    await page.locator(`a[href="/events/${eventId}"]`).first().click();
    await expect(page).toHaveURL(new RegExp(`/events/${eventId}$`));
    await expect(
      page.getByRole("heading", { name: title, exact: true }),
    ).toBeVisible();
    await expect(page.getByText("PUBLISHED", { exact: true })).toBeVisible();
    await screenshot("event-details");
    await page
      .getByRole("button", { name: "Add timeline item", exact: true })
      .click();
    await page
      .getByLabel("Title *", { exact: true })
      .fill("Disposable soundcheck");
    await page.getByLabel("Date *", { exact: true }).fill("2026-12-01");
    await page.getByLabel("Time *", { exact: true }).fill("17:00");
    await page.getByRole("button", { name: "Save milestone" }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Disposable soundcheck" }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Edit Disposable soundcheck" })
      .click();
    await page
      .getByLabel("Title *", { exact: true })
      .fill("Disposable updated soundcheck");
    await page.getByRole("button", { name: "Save milestone" }).click();
    await expect(
      page.getByRole("heading", { name: "Disposable updated soundcheck" }),
    ).toBeVisible();
    await screenshot("timeline");
    await page.getByRole("link", { name: "Edit event", exact: true }).click();
    await expect(page.getByLabel("Event name *", { exact: true })).toHaveValue(
      title,
    );
    await page
      .getByLabel("Event name *", { exact: true })
      .fill(`${title} edited`);
    await page
      .getByRole("button", { name: "Save changes", exact: true })
      .click();
    await expect(page).toHaveURL(new RegExp(`/events/${eventId}$`));
    await expect(
      page.getByRole("heading", { name: `${title} edited`, exact: true }),
    ).toBeVisible();
    const saved = await page.request.get(`/api/v1/events/${eventId}`);
    const dto = (await saved.json()).data.event;
    expect(dto.status).toBe("PUBLISHED");
    expect(dto.dressCode).toBe("Disposable QA dress code");
    expect(dto.endAt > dto.startAt).toBe(true);
    const stale = await page.request.patch(`/api/v1/events/${eventId}`, {
      data: {
        name: title,
        date: "2026-12-01",
        startTime: "19:30",
        status: "DRAFT",
        venue: dto.venue,
        updatedAt: "2000-01-01T00:00:00.000Z",
      },
    });
    expect(stale.status()).toBe(409);
    expect(
      (
        await page.request.get("/api/v1/events/000000000000000000000000")
      ).status(),
    ).toBe(404);
    await page
      .getByRole("button", { name: "Delete Disposable updated soundcheck" })
      .click();
    await page.getByRole("button", { name: "Confirm delete" }).click();
    await expect(
      page.getByRole("heading", { name: "The stage is quiet" }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Delete event", exact: true })
      .click();
    await page.getByRole("button", { name: "Confirm delete" }).click();
    await expect(page).toHaveURL(/\/events$/);
    expect((await page.request.get(`/api/v1/events/${eventId}`)).status()).toBe(
      404,
    );
    eventId = undefined;
  } finally {
    if (eventId) {
      const response = await page.request.get(`/api/v1/events/${eventId}`);
      if (response.ok()) {
        const dto = (await response.json()).data.event;
        const cleanup = await page.request.delete(
          `/api/v1/events/${eventId}?updatedAt=${encodeURIComponent(dto.updatedAt)}`,
        );
        expect(cleanup.ok(), "Disposable QA record cleanup failed").toBe(true);
      }
    }
  }
  await page
    .getByRole("button", { name: "Sign out", exact: true })
    .first()
    .click();
  await expect(page).toHaveURL(/\/login/);
  expect((await page.request.get("/api/v1/events")).status()).toBe(401);
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);
});
