export const VENDOR_CATEGORIES = [
  "VENUE",
  "PHOTOGRAPHER",
  "CATERER",
  "DECORATOR",
  "MAKEUP_ARTIST",
  "MEHENDI_ARTIST",
  "DJ",
  "BAND",
  "PANDIT",
  "INVITATION_PROVIDER",
  "OTHER",
] as const;
export const vendorLabel = (value: string) =>
  value === "DJ"
    ? "DJ"
    : value.charAt(0) + value.slice(1).toLowerCase().replaceAll("_", " ");
export type VendorOptions = { events: { id: string; name: string }[] };
export type VendorView = {
  id: string;
  name: string;
  category: string;
  contact: { personName: string; phone: string; email: string };
  service: string;
  notes: string;
  events: { id: string; name: string }[];
  status: "ACTIVE" | "ARCHIVED";
  revision: number;
};
export type VendorList = {
  vendors: VendorView[];
  total: number;
  page: number;
  limit: number;
};
export type VendorFinancials = {
  count: number;
  estimated: string;
  committed: string;
  paid: string;
};
export type VendorDetail = VendorView & { financials?: VendorFinancials };
