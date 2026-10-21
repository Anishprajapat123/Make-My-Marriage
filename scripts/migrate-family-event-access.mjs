// Explicit tenant-scoped migration for the approved Family Member event visibility.
import mongoose from "mongoose";
const tenant = process.argv.find((a) => a.startsWith("--tenant="))?.slice(9);
if (!tenant || !/^[a-f\d]{24}$/i.test(tenant))
  throw Error("Supply --tenant=<wedding ObjectId>.");
if (!process.env.MONGODB_URI) throw Error("MongoDB configuration is required.");
try {
  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 15000,
  });
  const roles = mongoose.connection.collection("roles"),
    filter = {
      tenantId: new mongoose.Types.ObjectId(tenant),
      key: "FAMILY_MEMBER",
      isSystemRole: true,
    };
  const role = await roles.findOne(filter, {
    projection: { permissionKeys: 1 },
  });
  if (!role) throw Error("No Family Member system role found.");
  console.log(
    JSON.stringify({
      roleFound: true,
      eventReadAlreadyPresent: role.permissionKeys.includes("VIEW_EVENTS"),
    }),
  );
  if (process.argv.includes("--apply")) {
    const result = await roles.updateOne(filter, {
      $addToSet: { permissionKeys: "VIEW_EVENTS" },
      $set: { updatedAt: new Date() },
    });
    console.log(
      JSON.stringify({
        matched: result.matchedCount,
        modified: result.modifiedCount,
      }),
    );
  }
} catch {
  console.error("FAMILY_EVENT_MIGRATION_FAILED");
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
