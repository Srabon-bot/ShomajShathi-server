import type { ObjectId } from "mongodb";

export interface JoinDocument {
  _id?: ObjectId;
  eventId: ObjectId;
  userId: string;
  userName: string;
  userEmail: string;
  userImage?: string | null;
  createdAt: Date;
}
