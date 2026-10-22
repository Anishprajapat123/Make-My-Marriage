import { vendorRequest, readJsonBody } from "@/modules/vendors/vendor.http";
import { archive } from "@/modules/vendors/vendor.service";
export function POST(
  request: Request,
  { params }: { params: Promise<{ vendorId: string }> },
) {
  return vendorRequest(async (ctx) =>
    archive(ctx, (await params).vendorId, await readJsonBody(request), true),
  );
}
