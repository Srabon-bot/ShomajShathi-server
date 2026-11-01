import "dotenv/config";

import { closeDatabase, connectDatabase } from "../db/connect.js";
import { env } from "../config/env.js";
import { eventTypes, type EventDocument } from "../models/event.model.js";

const seedRows: ReadonlyArray<readonly [string, (typeof eventTypes)[number], string, number]> = [
  ["Winter Clothes Drive — Mirpur 10", "Donation", "Mirpur 10 Roundabout, Dhaka", 60],
  ["Buriganga Bank Cleanup", "Cleanup", "Buriganga ghat, Old Dhaka", 80],
  ["Plant 200 Saplings — Hatirjheel", "Plantation", "Hatirjheel east bank, Dhaka", 100],
  ["Blankets for Mohammadpur Basti", "Donation", "Mohammadpur, Dhaka", 50],
  ["Dhanmondi Lake Plastic Sweep", "Cleanup", "Dhanmondi Lake, Road 27", 40],
  ["Reading Circle for Street Children", "Education", "Uttara Sector 7, Dhaka", 25],
];

// Fixed dates so the seeded events stay upcoming regardless of when the
// database is seeded. 04:00 UTC is 10:00 in Dhaka.
const seedDates = [
  "2026-12-05T04:00:00.000Z",
  "2026-12-12T04:00:00.000Z",
  "2026-12-19T04:00:00.000Z",
  "2027-01-09T04:00:00.000Z",
  "2027-01-16T04:00:00.000Z",
  "2027-01-23T04:00:00.000Z",
];

const seedEvents: Array<Omit<EventDocument, "_id" | "createdAt" | "updatedAt">> = seedRows.map(([title, type, location, capacity], index) => ({
  title,
  type: type as (typeof eventTypes)[number],
  location,
  capacity,
  image: `https://images.unsplash.com/${[
    "photo-1488521787991-ed7bbaae773c",
    "photo-1532996122724-e3c354a0b15b",
    "photo-1542601906990-b4d3fb778b09",
    "photo-1489493585363-d69421e0edd3",
    "photo-1618477461853-cf6ed80faba5",
    "photo-1503676260728-1c00da094a0b",
  ][index]}`,
  description: `Join neighbours for ${title.toLowerCase()}. Bring water, wear comfortable shoes, and arrive ten minutes before the start.`,
  date: new Date(seedDates[index]),
  attendeeCount: 0,
  organizerId: "seed-shomaj-shathi",
  organizerEmail: "community@shomajshathi.local",
  organizerName: "Shomaj Shathi community",
}));

async function seed() {
  const database = await connectDatabase(env.MONGODB_URI, env.MONGODB_DB);
  const collection = database.collection<EventDocument>("events");
  await collection.createIndex({ date: 1 });
  await collection.createIndex({ organizerId: 1, date: -1 });
  const result = await collection.bulkWrite(
    seedEvents.map((event) => ({
      updateOne: {
        filter: { title: event.title, organizerId: event.organizerId },
        update: { $set: { ...event, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
        upsert: true,
      },
    })),
    { ordered: false },
  );
  console.log(`Seeded ${seedEvents.length} events: ${result.upsertedCount} inserted, ${result.modifiedCount} updated.`);
}

seed()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(closeDatabase);
