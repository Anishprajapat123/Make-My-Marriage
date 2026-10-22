import { vendorRequest, readJsonBody } from "@/modules/vendors/vendor.http";
import * as service from "@/modules/vendors/vendor.service";
export function GET(request: Request) {
  return vendorRequest((ctx) =>
    service.list(ctx, Object.fromEntries(new URL(request.url).searchParams)),
  );
}
export function POST(request: Request) {
  return vendorRequest(
    async (ctx) => service.create(ctx, await readJsonBody(request)),
    201,
  );
}
