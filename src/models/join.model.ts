import { Schema, model, type InferSchemaType } from "mongoose";

const joinSchema = new Schema(
  {
    eventId: { type: Schema.Types.ObjectId, ref: "Event", required: true },
    userId: { type: String, required: true },
    userEmail: { type: String, required: true },
    userName: { type: String, required: true },
  },
  { timestamps: { createdAt: "joinedAt", updatedAt: false } },
);

joinSchema.index({ eventId: 1, userId: 1 }, { unique: true });
joinSchema.index({ userId: 1, joinedAt: -1 });

export type JoinDocument = InferSchemaType<typeof joinSchema>;
export const JoinModel = model("Join", joinSchema);
