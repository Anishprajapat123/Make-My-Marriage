export const GUEST_SIDES = ["BRIDE", "GROOM", "BOTH", "OTHER"] as const;
export const GUEST_TYPES = ["PRIMARY", "COMPANION", "CHILD", "OTHER"] as const;
export type GuestView = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  familyId: string | null;
  familyName: string | null;
  relationship: string;
  side: (typeof GUEST_SIDES)[number];
  guestType: (typeof GUEST_TYPES)[number];
  notes: string;
  status: "ACTIVE" | "ARCHIVED";
  revision: number;
};
export type FamilyView = {
  id: string;
  name: string;
  side: (typeof GUEST_SIDES)[number];
  notes: string;
  primaryContactGuestId: string | null;
  primaryContactName: string | null;
  revision: number;
  activeCount: number;
  archivedCount: number;
};
export type GuestList = {
  guests: GuestView[];
  page: number;
  limit: number;
  total: number;
  counts: {
    active: number;
    archived: number;
    families: number;
    ungrouped: number;
  };
};
export type FamilyList = {
  families: FamilyView[];
  page: number;
  limit: number;
  total: number;
};
export type DuplicateDetails = {
  confirmation: string;
  matches: {
    id: string;
    name: string;
    familyName: string | null;
    status: string;
    reasons: string[];
  }[];
};
