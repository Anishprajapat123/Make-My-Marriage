// Explicit, tenant-scoped migration for the approved family system templates.
// Run with --tenant=<wedding ObjectId>; inspect dry-run first, then add --apply.
import mongoose from "mongoose";
const tenant = process.argv
  .find((arg) => arg.startsWith("--tenant="))
  ?.slice(9);
if (!tenant || !/^[a-f\d]{24}$/i.test(tenant))
  throw new Error("Supply --tenant=<24-character wedding ObjectId>.");
const roleKey =
  process.argv.find((arg) => arg.startsWith("--role="))?.slice(7) ??
  "FAMILY_MEMBER";
if (!["FAMILY_MEMBER", "FAMILY_ADMIN"].includes(roleKey))
  throw new Error("Choose --role=FAMILY_MEMBER or --role=FAMILY_ADMIN.");
if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is required.");
try {
  await mongoose.connect(process.env.MONGODB_URI, { bufferCommands: false });
  const roles = mongoose.connection.collection("roles");
  const filter = {
    tenantId: new mongoose.Types.ObjectId(tenant),
    key: roleKey,
    isSystemRole: true,
  };
  const role = await roles.findOne(filter, {
    projection: { permissionKeys: 1 },
  });
  if (!role)
    throw new Error(
      "The selected family system role does not exist for this wedding.",
    );
  if (
    roleKey === "FAMILY_MEMBER" &&
    role.permissionKeys?.some((key) =>
      ["VIEW_TASKS", "MANAGE_TASKS"].includes(key),
    )
  )
    throw new Error(
      "This role has broad task permissions. Review it manually before applying assigned access.",
    );
  const added = ["VIEW_ASSIGNED_TASKS", "UPDATE_ASSIGNED_TASKS"].filter(
    (key) => !role.permissionKeys?.includes(key),
  );
  console.log(
    `Dry-run: ${added.length} assigned-task permissions missing from the selected system role.`,
  );
  if (process.argv.includes("--apply")) {
    const result = await roles.updateOne(
      {
        ...filter,
        ...(roleKey === "FAMILY_MEMBER"
          ? { permissionKeys: { $nin: ["VIEW_TASKS", "MANAGE_TASKS"] } }
          : {}),
      },
      {
        $addToSet: {
          permissionKeys: {
            $each: ["VIEW_ASSIGNED_TASKS", "UPDATE_ASSIGNED_TASKS"],
          },
        },
        $set: { updatedAt: new Date() },
      },
    );
    if (!result.matchedCount)
      throw new Error("Role changed during migration. Review and retry.");
    console.log(`Applied: ${result.modifiedCount} role updated.`);
  }
} catch {
  console.error(
    "TASK_PERMISSION_MIGRATION_FAILED: check configuration and the selected role. No credentials are logged.",
  );
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
