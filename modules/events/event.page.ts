import "server-only";
import { redirect } from "next/navigation";
import { requireTenant, AccessError } from "@/lib/tenant/context";
export async function eventPageContext(permission = "VIEW_EVENTS") {
  try {
    return await requireTenant(permission);
  } catch (e) {
    if (e instanceof AccessError) {
      if (e.status === 401) redirect("/login");
      if (e.code === "NO_WORKSPACE") redirect("/onboarding");
      return null;
    }
    throw e;
  }
}
