import { Schema, model } from "mongoose";

export const eventTypes = ["Cleanup", "Plantation", "Donation", "Education"] as const;

const eventSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, minlength: 6, maxlength: 90 },
    description: { type: String, required: true, trim: true, minlength: 20, maxlength: 2000 },
    type: { type: String, enum: eventTypes, required: true },
    image: { type: String, required: true },
    location: { type: String, required: true, trim: true, minlength: 3, maxlength: 120 },
    date: { type: Date, required: true, index: true },
    capacity: { type: Number, min: 1, max: 1000, default: 50 },
    attendeeCount: { type: Number, min: 0, default: 0 },
    organizerId: { type: String, required: true, index: true },
    organizerEmail: { type: String, required: true },
    organizerName: { type: String, required: true },
    organizerImage: { type: String, default: null },
  },
  { timestamps: true },
);

eventSchema.index({ organizerId: 1, date: -1 });

export const EventModel = model("Event", eventSchema);
