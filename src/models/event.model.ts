import type { ObjectId } from "mongodb";

export const eventTypes = ["Cleanup", "Plantation", "Donation", "Education"] as const;
export type EventType = (typeof eventTypes)[number];

export interface EventDocument {
  _id?: ObjectId;
  title: string;
  description: string;
  type: EventType;
  image: string;
  location: string;
  date: Date;
  capacity: number;
  attendeeCount: number;
  organizerId: string;
  organizerEmail: string;
  organizerName: string;
  organizerImage?: string | null;
  createdAt: Date;
  updatedAt: Date;
}
