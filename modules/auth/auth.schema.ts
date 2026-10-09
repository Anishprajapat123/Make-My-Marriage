import { z } from "zod";

const email = z.string().trim().toLowerCase().email().max(254);

export const registerSchema = z.object({
  displayName: z.string().trim().min(2).max(120),
  email,
  password: z.string().min(8).max(128),
});

export const credentialsSchema = z.object({
  email,
  password: z.string().min(1).max(128),
});

export const emailSchema = z.object({ email });

export const verifyEmailSchema = z.object({
  token: z.string().min(32).max(128),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(32).max(128),
  password: z.string().min(8).max(128),
});
