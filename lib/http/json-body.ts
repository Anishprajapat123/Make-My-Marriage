import "server-only";
import { AccessError } from "@/lib/tenant/context";
export async function readJsonBody(request: Request) {
  if (
    request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !==
    "application/json"
  )
    throw new AccessError(
      415,
      "UNSUPPORTED_MEDIA_TYPE",
      "Send an application/json request body.",
    );
  const origin = request.headers.get("origin");
  const expected = new URL(process.env.APP_BASE_URL ?? request.url).origin;
  if (origin && origin !== expected)
    throw new AccessError(
      403,
      "FORBIDDEN",
      "Requests must come from this application.",
    );
  return request.json();
}
