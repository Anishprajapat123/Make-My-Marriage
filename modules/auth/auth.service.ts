import "server-only";
import argon2 from "argon2";
import { createHash, randomBytes } from "node:crypto";
import { connectToDatabase } from "@/lib/db/mongoose";
import { sendTransactionalEmail } from "@/lib/email/ses";
import { AuthTokenModel } from "./auth-token.model";
import {
  credentialsSchema,
  emailSchema,
  registerSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from "./auth.schema";
import { UserModel } from "./user.model";

const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;
const TOKEN_RESEND_COOLDOWN_MS = 60 * 1000;
const DUMMY_PASSWORD_HASH = argon2.hash(randomBytes(32).toString("base64url"), {
  type: argon2.argon2id,
});

type TokenPurpose = "EMAIL_VERIFICATION" | "PASSWORD_RESET";

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function createRawToken() {
  return randomBytes(32).toString("base64url");
}

async function issueToken(
  userId: string,
  purpose: TokenPurpose,
  ttlMs: number,
) {
  const now = new Date();
  const recentToken = await AuthTokenModel.findOne({
    userId,
    purpose,
    createdAt: { $gt: new Date(now.getTime() - TOKEN_RESEND_COOLDOWN_MS) },
  })
    .select("_id")
    .lean();

  if (recentToken) {
    return null;
  }

  const rawToken = createRawToken();
  await AuthTokenModel.findOneAndUpdate(
    { userId, purpose },
    {
      $set: {
        tokenHash: hashToken(rawToken),
        expiresAt: new Date(now.getTime() + ttlMs),
        createdAt: now,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  return rawToken;
}

function getAppUrl() {
  const url = process.env.APP_BASE_URL;
  if (!url) {
    throw new Error("APP_BASE_URL is not configured.");
  }
  return url;
}

async function emailToken({
  userId,
  email,
  displayName,
  purpose,
  ttlMs,
  route,
  subject,
  instructions,
}: {
  userId: string;
  email: string;
  displayName: string;
  purpose: TokenPurpose;
  ttlMs: number;
  route: string;
  subject: string;
  instructions: string;
}) {
  const token = await issueToken(userId, purpose, ttlMs);
  if (!token) {
    return;
  }

  const link = new URL(route, getAppUrl());
  link.searchParams.set("token", token);

  try {
    await sendTransactionalEmail({
      to: email,
      subject,
      text: `Hello ${displayName},\n\n${instructions}\n\n${link.toString()}\n\nIf you did not request this, you can ignore this email.`,
    });
  } catch (error) {
    await AuthTokenModel.deleteOne({
      userId,
      purpose,
      tokenHash: hashToken(token),
    });
    throw error;
  }
}

async function sendVerificationEmail(user: {
  id: string;
  email: string;
  displayName: string;
}) {
  await emailToken({
    userId: user.id,
    email: user.email,
    displayName: user.displayName,
    purpose: "EMAIL_VERIFICATION",
    ttlMs: EMAIL_VERIFICATION_TTL_MS,
    route: "/verify-email",
    subject: "Verify your Make My Marriage account",
    instructions:
      "Verify your email address to finish creating your account. This link expires in 24 hours.",
  });
}

export async function registerLocalAccount(input: unknown) {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, invalid: true as const };
  }

  const { displayName, email } = parsed.data;
  await connectToDatabase();

  let user = await UserModel.findOne({ email });
  if (!user) {
    const passwordHash = await argon2.hash(parsed.data.password, {
      type: argon2.argon2id,
    });

    try {
      user = await UserModel.create({
        email,
        displayName,
        passwordHash,
        authProvider: "LOCAL",
        emailVerifiedAt: null,
        status: "ACTIVE",
      });
    } catch (error) {
      if (!isDuplicateKeyError(error)) {
        throw error;
      }
      user = await UserModel.findOne({ email });
    }
  }

  if (user?.authProvider === "LOCAL" && !user.emailVerifiedAt) {
    await sendVerificationEmail({
      id: user._id.toString(),
      email: user.email,
      displayName: user.displayName,
    });
  }

  return { success: true as const };
}

export async function authenticateLocalCredentials(input: unknown) {
  const parsed = credentialsSchema.safeParse(input);
  if (!parsed.success) {
    return null;
  }

  await connectToDatabase();
  const user = await UserModel.findOne({
    email: parsed.data.email,
    authProvider: "LOCAL",
    status: "ACTIVE",
  }).select("+passwordHash");

  const passwordHash = user?.passwordHash ?? (await DUMMY_PASSWORD_HASH);
  const validPassword = await argon2.verify(passwordHash, parsed.data.password);
  if (!user?.passwordHash || !user.emailVerifiedAt || !validPassword) {
    return null;
  }

  return {
    id: user._id.toString(),
    name: user.displayName,
    email: user.email,
    image: user.avatarUrl ?? undefined,
  };
}

export async function getActiveSessionVersion(userId: string) {
  await connectToDatabase();
  const user = await UserModel.findOne({
    _id: userId,
    status: "ACTIVE",
  })
    .select("sessionVersion")
    .lean();
  return user ? (user.sessionVersion ?? 0) : null;
}

export async function findOrCreateGoogleAccount(profile: {
  sub?: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
}) {
  if (!profile.sub || !profile.email || profile.email_verified !== true) {
    return null;
  }

  const email = profile.email.trim().toLowerCase();
  const displayName = profile.name?.trim() || email.split("@")[0];
  await connectToDatabase();

  const bySubject = await UserModel.findOne({
    authProvider: "GOOGLE",
    googleSubject: profile.sub,
  });
  if (bySubject) {
    if (bySubject.status !== "ACTIVE") {
      return null;
    }
    return {
      id: bySubject._id.toString(),
      email: bySubject.email,
      name: bySubject.displayName,
      image: bySubject.avatarUrl ?? undefined,
    };
  }

  if (await UserModel.exists({ email })) {
    return null;
  }

  try {
    const user = await UserModel.create({
      email,
      emailVerifiedAt: new Date(),
      authProvider: "GOOGLE",
      googleSubject: profile.sub,
      displayName,
      avatarUrl: profile.picture ?? null,
      status: "ACTIVE",
    });

    return {
      id: user._id.toString(),
      email: user.email,
      name: user.displayName,
      image: user.avatarUrl ?? undefined,
    };
  } catch (error) {
    if (!isDuplicateKeyError(error)) {
      throw error;
    }

    const concurrentUser = await UserModel.findOne({
      authProvider: "GOOGLE",
      googleSubject: profile.sub,
      status: "ACTIVE",
    });
    if (!concurrentUser) {
      return null;
    }

    return {
      id: concurrentUser._id.toString(),
      email: concurrentUser.email,
      name: concurrentUser.displayName,
      image: concurrentUser.avatarUrl ?? undefined,
    };
  }
}

export async function verifyEmail(input: unknown) {
  const parsed = verifyEmailSchema.safeParse(input);
  if (!parsed.success) {
    return false;
  }

  await connectToDatabase();
  const token = await AuthTokenModel.findOneAndDelete({
    purpose: "EMAIL_VERIFICATION",
    tokenHash: hashToken(parsed.data.token),
    expiresAt: { $gt: new Date() },
  });
  if (!token) {
    return false;
  }

  const result = await UserModel.updateOne(
    { _id: token.userId, status: "ACTIVE", emailVerifiedAt: null },
    { $set: { emailVerifiedAt: new Date() } },
  );
  return result.modifiedCount === 1;
}

export async function requestPasswordReset(input: unknown) {
  const parsed = emailSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, invalid: true as const };
  }

  await connectToDatabase();
  const user = await UserModel.findOne({
    email: parsed.data.email,
    authProvider: "LOCAL",
    status: "ACTIVE",
    emailVerifiedAt: { $ne: null },
  });

  if (user) {
    await emailToken({
      userId: user._id.toString(),
      email: user.email,
      displayName: user.displayName,
      purpose: "PASSWORD_RESET",
      ttlMs: PASSWORD_RESET_TTL_MS,
      route: "/reset-password",
      subject: "Reset your Make My Marriage password",
      instructions:
        "Use this link to reset your password. This link expires in one hour.",
    });
  }

  return { success: true as const };
}

export async function resetLocalPassword(input: unknown) {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return false;
  }

  await connectToDatabase();
  const token = await AuthTokenModel.findOneAndDelete({
    purpose: "PASSWORD_RESET",
    tokenHash: hashToken(parsed.data.token),
    expiresAt: { $gt: new Date() },
  });
  if (!token) {
    return false;
  }

  const passwordHash = await argon2.hash(parsed.data.password, {
    type: argon2.argon2id,
  });
  const result = await UserModel.updateOne(
    {
      _id: token.userId,
      authProvider: "LOCAL",
      status: "ACTIVE",
      emailVerifiedAt: { $ne: null },
    },
    { $set: { passwordHash }, $inc: { sessionVersion: 1 } },
  );
  return result.modifiedCount === 1;
}

function isDuplicateKeyError(error: unknown): error is { code: number } {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === 11000
  );
}
