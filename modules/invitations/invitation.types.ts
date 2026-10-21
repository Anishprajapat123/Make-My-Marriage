export type InvitationConfig = {
  id: string;
  title: string;
  welcomeMessage: string;
  story: string;
  language: "en" | "hi";
  published: boolean;
  revision: number;
};
export type InvitationRow = {
  guestId: string;
  name: string;
  familyName: string | null;
  guestStatus: string;
  linkId: string | null;
  linkStatus: "ACTIVE" | "REVOKED" | null;
  revision: number | null;
  lastRsvpAt: string | null;
  response: "YES" | "NO" | "PENDING" | null;
};
export type InvitationList = {
  rows: InvitationRow[];
  total: number;
  page: number;
  limit: number;
  counts: {
    active: number;
    yes: number;
    no: number;
    pending: number;
    linked: number;
  };
};
export type PublicInvitation = {
  wedding: {
    title: string;
    bride: string;
    groom: string;
    city: string;
    date: string;
    timezone: string;
  };
  invitation: {
    title: string;
    welcomeMessage: string;
    story: string;
    language: "en" | "hi";
  };
  guest: { name: string };
  events: {
    id: string;
    name: string;
    description: string;
    startAt: string;
    endAt: string | null;
    dressCode: string;
    venue: {
      name: string;
      addressLine1: string;
      city: string;
      mapUrl: string;
      directions: string;
    };
  }[];
  rsvp: {
    canAddCompanions: boolean;
    response: "YES" | "NO" | "PENDING";
    revision: number;
    companions: {
      clientId: string;
      name: string;
      guestType: "COMPANION" | "CHILD";
      attending: boolean;
    }[];
  };
};
