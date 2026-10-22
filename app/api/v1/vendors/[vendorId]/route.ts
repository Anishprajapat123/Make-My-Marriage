import { vendorRequest, readJsonBody } from "@/modules/vendors/vendor.http";
import * as service from "@/modules/vendors/vendor.service";
type Context = { params: Promise<{ vendorId: string }> };
export function GET(_: Request, { params }: Context) {
  return vendorRequest(async (ctx) =>
    service.detail(ctx, (await params).vendorId),
  );
}
export function PATCH(request: Request, { params }: Context) {
  return vendorRequest(async (ctx) =>
    service.update(ctx, (await params).vendorId, await readJsonBody(request)),
  );
}
export function DELETE(request: Request, { params }: Context) {
  return vendorRequest(async (ctx) =>
    service.archive(ctx, (await params).vendorId, await readJsonBody(request)),
  );
}
