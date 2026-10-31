export function toEventDto(event: {
  _id: { toString(): string };
  title: string;
  description: string;
  type: string;
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
}) {
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
