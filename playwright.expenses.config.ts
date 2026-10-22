import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "expenses-flow.spec.ts",
  workers: 1,
  retries: 0,
  expect: { timeout: 20000 },
  use: {
    baseURL: "https://make-my-marriage-sepia.vercel.app",
    ...devices["Desktop Chrome"],
    trace: "off",
  },
});
