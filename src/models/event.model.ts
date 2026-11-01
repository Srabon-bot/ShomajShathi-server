import { Schema, model, type InferSchemaType } from "mongoose";

const eventSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, minlength: 6, maxlength: 90 },
    description: { type: String, required: true, trim: true, minlength: 20, maxlength: 2000 },
    type: {
      type: String,
      enum: ["Cleanup", "Plantation", "Donation", "Education"],
      required: true,
    },
    image: { type: String, required: true, trim: true },
    location: { type: String, required: true, trim: true, minlength: 3, maxlength: 120 },
    date: { type: Date, required: true },
    capacity: { type: Number, required: true, min: 1, max: 1000, default: 50 },
    whatToBring: {
      type: [String],
      required: true,
      validate: { validator: (items: string[]) => items.length >= 3 && items.length <= 5 },
    },
    isFree: { type: Boolean, required: true, default: true },
    attendeeCount: { type: Number, required: true, min: 0, default: 0 },
    organizerId: { type: String, required: true, index: true },
    organizerEmail: { type: String, required: true },
    organizerName: { type: String, required: true },
    organizerImage: { type: String, default: null },
  },
  { timestamps: true },
);

eventSchema.index({ date: 1 });
eventSchema.index({ organizerId: 1, date: -1 });

export type EventDocument = InferSchemaType<typeof eventSchema>;
export const EventModel = model("Event", eventSchema);
