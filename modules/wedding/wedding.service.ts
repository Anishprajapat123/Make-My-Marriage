import "server-only";
import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/db/mongoose";
import { findCurrentMembershipForUser } from "@/modules/members/membership.service";
import { MemberModel } from "@/modules/members/member.model";
import { DEFAULT_WEDDING_ROLES } from "@/modules/roles/permissions";
import { RoleModel } from "@/modules/roles/role.model";
import { createWeddingSchema, type CreateWeddingInput } from "./wedding.schema";
import { WeddingModel } from "./wedding.model";

export class WeddingSetupError extends Error {
  constructor(readonly code: "WEDDING_ALREADY_EXISTS") {
    super(code);
  }
}

function createSlug(title: string, id: Types.ObjectId) {
  const base = title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);

  return `${base || "wedding"}-${id.toString().slice(-6)}`;
}

function isMembershipConflict(error: unknown) {
  if (
    typeof error !== "object" ||
    error === null ||
    !("code" in error) ||
    error.code !== 11000
  ) {
    return false;
  }

  return (
    !("keyPattern" in error) ||
    typeof error.keyPattern !== "object" ||
    error.keyPattern === null ||
    "userId" in error.keyPattern
  );
}

export async function createWeddingForUser(
  userId: string,
  input: CreateWeddingInput,
) {
  await connectToDatabase();
  const ownerUserId = new Types.ObjectId(userId);

  const existingMembership = await findCurrentMembershipForUser(userId);
  if (existingMembership) {
    throw new WeddingSetupError("WEDDING_ALREADY_EXISTS");
  }

  const weddingId = new Types.ObjectId();
  const roleIds = DEFAULT_WEDDING_ROLES.map(({ key }) => ({
    key,
    id: new Types.ObjectId(),
  }));
  const ownerRoleId = roleIds.find(({ key }) => key === "OWNER")!.id;
  const memberId = new Types.ObjectId();
  const now = new Date();
  const session = await WeddingModel.startSession();

  try {
    await session.withTransaction(async () => {
      const concurrentMembership = await MemberModel.findOne({
        userId: ownerUserId,
        membershipStatus: { $in: ["ACTIVE", "SUSPENDED"] },
      })
        .session(session)
        .select("_id")
        .lean();

      if (concurrentMembership) {
        throw new WeddingSetupError("WEDDING_ALREADY_EXISTS");
      }

      await WeddingModel.create(
        [
          {
            _id: weddingId,
            slug: createSlug(input.title, weddingId),
            status: "PLANNING",
            bride: { name: input.brideName },
            groom: { name: input.groomName },
            title: input.title,
            weddingDate: new Date(`${input.weddingDate}T00:00:00.000Z`),
            city: input.city,
            timezone: input.timezone,
            language: input.language,
            storage: { quotaBytes: 5_368_709_120, usedBytes: 0 },
            summary: {
              guestCount: 0,
              rsvpYesCount: 0,
              rsvpNoCount: 0,
              rsvpPendingCount: 0,
              taskOpenCount: 0,
              taskCompletedCount: 0,
              expensePaidAmount: 0,
              expenseCommittedAmount: 0,
            },
            settings: {
              publicWeddingPageEnabled: true,
              publicGalleryEnabled: true,
              publicLivestreamEnabled: true,
              defaultReminderEnabled: true,
            },
          },
        ],
        { session },
      );

      await RoleModel.create(
        DEFAULT_WEDDING_ROLES.map((role) => ({
          _id: roleIds.find(({ key }) => key === role.key)!.id,
          tenantId: weddingId,
          ...role,
          permissionKeys: [...role.permissionKeys],
          isSystemRole: true,
          createdByMemberId: memberId,
        })),
        { session },
      );

      await MemberModel.create(
        [
          {
            _id: memberId,
            tenantId: weddingId,
            userId: ownerUserId,
            roleIds: [ownerRoleId],
            membershipStatus: "ACTIVE",
            joinedAt: now,
          },
        ],
        { session },
      );
    });
  } catch (error) {
    if (error instanceof WeddingSetupError || isMembershipConflict(error)) {
      throw new WeddingSetupError("WEDDING_ALREADY_EXISTS");
    }
    throw error;
  } finally {
    await session.endSession();
  }

  return {
    id: weddingId.toString(),
    slug: createSlug(input.title, weddingId),
    title: input.title,
    weddingDate: input.weddingDate,
    city: input.city,
    timezone: input.timezone,
    language: input.language,
    membershipId: memberId.toString(),
    role: "OWNER" as const,
  };
}

export async function getCurrentWeddingForUser(userId: string) {
  const membership = await findCurrentMembershipForUser(userId);
  if (!membership || membership.membershipStatus !== "ACTIVE") {
    return { membership, wedding: null, roles: [], effectivePermissions: [] };
  }

  await connectToDatabase();
  const tenantId = membership.tenantId;
  const [wedding, roles] = await Promise.all([
    WeddingModel.findOne({ _id: tenantId })
      .select("slug title bride groom weddingDate city timezone language")
      .lean(),
    RoleModel.find({ _id: { $in: membership.roleIds }, tenantId })
      .select("key permissionKeys")
      .lean(),
  ]);

  const effectivePermissions = [
    ...new Set(roles.flatMap((role) => role.permissionKeys)),
  ];

  return {
    membership,
    wedding,
    roles: roles.map((role) => ({
      key: role.key,
      permissionKeys: role.permissionKeys,
    })),
    effectivePermissions,
  };
}

export function parseCreateWeddingInput(input: unknown) {
  return createWeddingSchema.safeParse(input);
}
