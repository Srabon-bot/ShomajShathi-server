import { connectDatabase } from "../db/connect.js";
import { EventModel } from "../models/event.model.js";

const seedEvents = [
  {
    title: "Winter Clothes Drive — Mirpur 10",
    type: "Donation",
    location: "Mirpur 10 Roundabout, Dhaka",
    capacity: 60,
  },
  {
    title: "Buriganga Bank Cleanup",
    type: "Cleanup",
    location: "Buriganga ghat, Old Dhaka",
    capacity: 80,
  },
  {
    title: "Plant 200 Saplings — Hatirjheel",
    type: "Plantation",
    location: "Hatirjheel east bank, Dhaka",
    capacity: 100,
  },
  {
    title: "Blankets for Mohammadpur Basti",
    type: "Donation",
    location: "Mohammadpur, Dhaka",
    capacity: 50,
  },
  {
    title: "Dhanmondi Lake Plastic Sweep",
    type: "Cleanup",
    location: "Dhanmondi Lake, Road 27",
    capacity: 40,
  },
  {
    title: "Reading Circle for Street Children",
    type: "Education",
    location: "Uttara Sector 7, Dhaka",
    capacity: 25,
  },
] as const;

await connectDatabase();
await EventModel.deleteMany({ organizerId: "seed" });
await EventModel.insertMany(
  seedEvents.map((event, index) => ({
    ...event,
    description: "A practical community event. Bring closed shoes and water; the team will brief everyone on arrival.",
    image: `https://images.unsplash.com/photo-${1500000000000 + index}?auto=format&fit=crop&w=1200&q=80`,
    date: new Date(Date.now() + (index + 5) * 86400000),
    whatToBring: ["Closed shoes", "Water bottle", "Sun protection"],
    isFree: true,
    organizerId: "seed",
    organizerEmail: "hello@shomajshathi.org",
    organizerName: "Shomaj Shathi",
  })),
);
console.info(`Seeded ${seedEvents.length} events.`);
process.exit(0);
