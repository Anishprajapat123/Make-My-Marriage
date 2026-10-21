import { defineConfig } from "@playwright/test";
import membersConfig from "./playwright.members.config";

// Reuse the isolated production server with SES disabled, never the user's dev session.
export default defineConfig({
  ...membersConfig,
  testMatch: "guests-flow.spec.ts",
});
