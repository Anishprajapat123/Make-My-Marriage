export const EVENT_STATUSES = [
  "DRAFT",
  "PUBLISHED",
  "COMPLETED",
  "CANCELLED",
] as const;
export type EventStatus = (typeof EVENT_STATUSES)[number];
export type EventView = {
  id: string;
  name: string;
  ceremonyType: string;
  description: string;
  startAt: string;
  endAt: string | null;
  status: EventStatus;
  dressCode: string;
  notes: string;
  venue: {
    name: string;
    addressLine1: string;
    city: string;
    state: string;
    postalCode: string;
    mapUrl: string;
    directions: string;
  };
  timelineItems: { id: string; title: string; at: string; note: string }[];
  updatedAt: string;
};
