import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "members-flow.spec.ts",
  workers: 1,
  use: { baseURL: "http://localhost:3101", ...devices["Desktop Chrome"] },
  webServer: {
    command: "node tests/e2e/start-members-server.mjs",
    url: "http://127.0.0.1:3101",
    reuseExistingServer: false,
    env: {
      APP_BASE_URL: "http://localhost:3101",
      AUTH_URL: "http://localhost:3101",
      AUTH_TRUST_HOST: "true",
      AWS_REGION: "",
      SES_FROM_EMAIL: "",
    },
  },
});
