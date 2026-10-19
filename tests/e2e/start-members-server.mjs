// Isolated production fixture server. Email configuration is disabled by Playwright.
import { cpSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
try {
  process.loadEnvFile(".env.local");
} catch {
  /* CI may supply the environment. */
}
if (process.env.AWS_REGION || process.env.SES_FROM_EMAIL)
  throw new Error("Members fixture server requires email sending disabled.");
if (existsSync("public"))
  cpSync("public", ".next/standalone/public", { recursive: true });
cpSync(".next/static", ".next/standalone/.next/static", { recursive: true });
process.env.PORT = "3101";
process.env.HOSTNAME = "127.0.0.1";
await import(pathToFileURL(resolve(".next/standalone/server.js")).href);
