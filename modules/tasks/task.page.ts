import "server-only";
import { redirect } from "next/navigation";
import { requireTenant, AccessError } from "@/lib/tenant/context";
import { TASK_READ_PERMISSIONS } from "./task.access";
export async function taskPageContext() {
  try {
    return await requireTenant(TASK_READ_PERMISSIONS);
  } catch (e) {
    if (e instanceof AccessError) {
      if (e.status === 401) redirect("/login");
      if (e.code === "NO_WORKSPACE") redirect("/onboarding");
      return null;
    }
    throw e;
  }
}
