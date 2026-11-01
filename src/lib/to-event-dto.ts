import type { EventDocument } from "../models/event.model.js";

export function toEventDto(event: EventDocument) {
  if (!event._id) throw new Error("Event document is missing an id.");
  return {
    id: event._id.toString(),
    title: event.title,
    description: event.description,
    type: event.type,
    image: event.image,
    location: event.location,
    date: event.date.toISOString(),
    capacity: event.capacity,
    attendeeCount: event.attendeeCount,
    organizer: {
      id: event.organizerId,
      email: event.organizerEmail,
      name: event.organizerName,
      image: event.organizerImage ?? null,
    },
    createdAt: event.createdAt.toISOString(),
  };
}
