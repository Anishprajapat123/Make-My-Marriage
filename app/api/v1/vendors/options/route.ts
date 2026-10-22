import { vendorRequest } from "@/modules/vendors/vendor.http";
import { options } from "@/modules/vendors/vendor.service";
export function GET() {
  return vendorRequest(options);
}
