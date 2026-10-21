import { defineConfig } from "@playwright/test";
import isolated from "./playwright.members.config";
export default defineConfig({
  ...isolated,
  testMatch: "invitations-flow.spec.ts",
});
