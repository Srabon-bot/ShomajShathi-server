import "dotenv/config";

import { connectDatabase } from "../db/connect.js";
import { env } from "../config/env.js";
import { EventModel } from "../models/event.model.js";

const imageByTitle: Record<string, string> = {
  "Winter Clothes Drive — Mirpur 10": "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c",
  "Buriganga Bank Cleanup": "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b",
  "Plant 200 Saplings — Hatirjheel": "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09",
  "Blankets for Mohammadpur Basti": "https://images.unsplash.com/photo-1489493585363-d69421e0edd3",
  "Dhanmondi Lake Plastic Sweep": "https://images.unsplash.com/photo-1618477461853-cf6ed80faba5",
  "Reading Circle for Street Children": "https://images.unsplash.com/photo-1503676260728-1c00da094a0b",
};

const seedEvents = [
  ["Winter Clothes Drive — Mirpur 10", "Donation", "Mirpur 10 Roundabout, Dhaka", 60],
  ["Buriganga Bank Cleanup", "Cleanup", "Buriganga ghat, Old Dhaka", 80],
  ["Plant 200 Saplings — Hatirjheel", "Plantation", "Hatirjheel east bank, Dhaka", 100],
  ["Blankets for Mohammadpur Basti", "Donation", "Mohammadpur, Dhaka", 50],
  ["Dhanmondi Lake Plastic Sweep", "Cleanup", "Dhanmondi Lake, Road 27", 40],
  ["Reading Circle for Street Children", "Education", "Uttara Sector 7, Dhaka", 25],
] as const;

async function seed() {
  if (!env.MONGODB_URI) throw new Error("MONGODB_URI is required to seed events.");
  await connectDatabase(env.MONGODB_URI);
  await EventModel.deleteMany({ organizerId: "seed-uddom" });
  await EventModel.insertMany(
    seedEvents.map(([title, type, location, capacity], index) => ({
      title,
      type,
      location,
      capacity,
      image: imageByTitle[title],
      description: `Join neighbours for ${title.toLowerCase()}. Bring water, wear comfortable shoes, and arrive ten minutes before the start.`,
      date: new Date(Date.now() + (index + 2) * 86400000),
      organizerId: "seed-uddom",
      organizerEmail: "community@uddom.local",
      organizerName: "Uddom community",
    })),
  );
  console.log("Seeded six Uddom events.");
  process.exit(0);
}

seed().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
