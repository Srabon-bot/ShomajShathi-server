import "dotenv/config";

import { closeDatabase, connectDatabase } from "../db/connect.js";
import { env } from "../config/env.js";
import { eventTypes, type EventDocument } from "../models/event.model.js";

type SeedRow = {
  title: string;
  type: (typeof eventTypes)[number];
  location: string;
  capacity: number;
  attendees: number;
  /** Days from the moment the seed runs. Negative values are past events. */
  days: number;
  image: string;
  description: string;
};

const BASE = "https://shomajshathi-app.vercel.app/images";
const photo = (filename: string) => `${BASE}/${encodeURIComponent(filename)}`;

/**
 * Fixed titles keep the upsert idempotent: re-running the seed updates the
 * existing documents (and their URLs on the live site) instead of creating
 * duplicates. Dates are relative so the archive and the upcoming list stay
 * meaningful no matter when the seed is run.
 */
const seedRows: SeedRow[] = [
  // Upcoming
  {
    title: "Gulshan Lake Morning Sweep",
    type: "Cleanup",
    location: "Gulshan 2 lake, Dhaka",
    capacity: 45,
    attendees: 27,
    days: 2,
    image: photo("gulshanlake clean upcoming.jpg"),
    description:
      "We meet at the Gulshan 2 footbridge at 8am with gloves, bags and grabbers. Two hours of walking the east bank, sorting plastic from organic waste, and stacking the bags for the city truck.",
  },
  {
    title: "Winter Clothes Drive — Mirpur 10",
    type: "Donation",
    location: "Mirpur 10 Roundabout, Dhaka",
    capacity: 60,
    attendees: 34,
    days: 5,
    image: photo("winter clothes donation bd 1.jpg"),
    description:
      "Bring clean winter jackets, blankets and sweaters in wearable condition. We sort by size, pack them into family bundles, and hand them out with the Mirpur 10 ward volunteers the same evening.",
  },
  {
    title: "Winter Jackets for Tejgaon Railway Basti",
    type: "Donation",
    location: "Tejgaon, Dhaka",
    capacity: 55,
    attendees: 18,
    days: 7,
    image: photo("winter clothes donation bd 2.jpg"),
    description:
      "A collection and distribution run for the families living along the Tejgaon railway line. We need people to sort donations, carry bundles, and help with the queue so nothing turns into a scramble.",
  },
  {
    title: "Rooftop Garden Workshop",
    type: "Education",
    location: "Lalmatia, Dhaka",
    capacity: 30,
    attendees: 22,
    days: 9,
    image: photo("Rooftop Garden Workshop (upcoming).jpg"),
    description:
      "A hands-on morning on container gardening for people with a balcony or a shared roof. We cover soil mixing, drainage, winter vegetables, and how to keep a small garden alive through load-shedding.",
  },
  {
    title: "Plant 200 Saplings — Hatirjheel",
    type: "Plantation",
    location: "Hatirjheel east bank, Dhaka",
    capacity: 100,
    attendees: 41,
    days: 12,
    image: photo("Hatirjheel Tree Plantation upcoming.jpg"),
    description:
      "Two hundred native saplings go into the east bank with the Hatirjheel maintenance team. Bring a trowel if you have one, wear closed shoes, and expect to get your hands dirty. Water and saplings are provided.",
  },
  {
    title: "300 Saplings — Rayer Bazar",
    type: "Plantation",
    location: "Rayer Bazar, Dhaka",
    capacity: 90,
    attendees: 30,
    days: 14,
    image: photo("Rayer Bazar Tree Plantation upcoming.jpg"),
    description:
      "A morning of planting along the Rayer Bazar embankment, followed by tree guards and a watering rota for the dry weeks ahead. We pair every new volunteer with someone who has planted here before.",
  },
  {
    title: "Old Dhaka Plastic Audit",
    type: "Cleanup",
    location: "Nawabpur Road, Old Dhaka",
    capacity: 35,
    attendees: 8,
    days: 16,
    image: photo("river clean upcoming.webp"),
    description:
      "Instead of only picking up waste, we count it. Small teams walk fixed stretches of Nawabpur Road, record what they find by category, and publish the totals so shops can see where the plastic actually comes from.",
  },
  {
    title: "Reading Circle for Street Children",
    type: "Education",
    location: "Uttara Sector 7, Dhaka",
    capacity: 25,
    attendees: 11,
    days: 19,
    image: photo("street children in bangladesh education circle.jpg"),
    description:
      "A relaxed Saturday reading circle for children who work near the Sector 7 market. Volunteers read aloud, help with letters and numbers, and hand out a book each child can keep. No teaching experience needed.",
  },
  {
    title: "School Kits for Jatrabari",
    type: "Donation",
    location: "Jatrabari, Dhaka",
    capacity: 60,
    attendees: 12,
    days: 23,
    image: photo("School Kits donation bd 1.jpg"),
    description:
      "We are packing 150 school kits — notebook, pencils, eraser, sharpener, ruler — for children starting the new term in Jatrabari. Come for the packing line or volunteer to deliver kits to the two partner schools.",
  },
  {
    title: "Mohammadpur Lake Bank Cleanup",
    type: "Cleanup",
    location: "Mohammadpur lake, Dhaka",
    capacity: 50,
    attendees: 19,
    days: 26,
    image: photo("mohammadpur lake upcoming.jpg"),
    description:
      "The lake bank collects plastic bags and food wrappers every week. We work in pairs from the main gate to the far corner, weigh what we collect, and leave the sorted bags at the collection point.",
  },
  {
    title: "Maths Club for Class Five",
    type: "Education",
    location: "Shahbagh, Dhaka",
    capacity: 20,
    attendees: 6,
    days: 33,
    image: photo("Maths Club for Class Five 1.jpg"),
    description:
      "An hour of fractions, puzzles and number games for Class Five students at the Shahbagh community room. We keep groups to five children per volunteer so everyone gets a turn at the board.",
  },
  {
    title: "Tree Guard Painting — Uttara",
    type: "Plantation",
    location: "Uttara Sector 4, Dhaka",
    capacity: 40,
    attendees: 14,
    days: 40,
    image: photo("Tree Guard Painting - Uttara (upcoming).jpg"),
    description:
      "The saplings planted last season need guards and a fresh coat of paint. Bring old clothes and a brush if you have one; we provide paint, sandpaper and stencils. Children are welcome with a guardian.",
  },
  {
    title: "Blanket Drive — Kamrangirchar",
    type: "Donation",
    location: "Kamrangirchar, Dhaka",
    capacity: 70,
    attendees: 25,
    days: 47,
    image: photo("Blanket Drive - Kamrangirchar (upcoming).jpg"),
    description:
      "A door-to-door collection across three Kamrangirchar lanes, followed by sorting at the community centre. Blankets must be clean and usable; we repair torn edges before they go out.",
  },
  {
    title: "Buriganga Second Sweep",
    type: "Cleanup",
    location: "Buriganga ghat, Old Dhaka",
    capacity: 80,
    attendees: 9,
    days: 54,
    image: photo("Buriganga Second Sweep (upcoming).jpg"),
    description:
      "A follow-up sweep of the ghats we cleaned earlier this year, plus a check on the new bins installed along the bank. We finish with a short debrief on what is working and what keeps floating back.",
  },
  {
    title: "Winter Reading Camp",
    type: "Education",
    location: "Dhanmondi, Dhaka",
    capacity: 25,
    attendees: 4,
    days: 61,
    image: photo("street children in bangladesh education teaching.jpg"),
    description:
      "A three-hour camp with stories, drawing and a small library corner for children from the Dhanmondi footpath families. We need readers, a hand with the craft table, and people to serve the midday snack.",
  },
  {
    title: "Hatirjheel Riverside Planting",
    type: "Plantation",
    location: "Hatirjheel west bank, Dhaka",
    capacity: 75,
    attendees: 16,
    days: 68,
    image: photo("Hatirjheel Riverside Planting (upcoming).jpg"),
    description:
      "The second planting wave on the west bank, this time with taller saplings and a drip-watering setup. Volunteers from the first wave are encouraged to come back and check how their trees are doing.",
  },

  // Past
  {
    title: "Dhanmondi Lake Plastic Sweep",
    type: "Cleanup",
    location: "Dhanmondi Lake, Road 27",
    capacity: 40,
    attendees: 36,
    days: -6,
    image: photo("mohammadpur lake bank past.jpg"),
    description:
      "Thirty-six of us walked the lake from Road 27 to the bridge and back. We collected 62 bags of mostly food packaging, weighed them at the gate, and left the sorted plastic with the ward collection van.",
  },
  {
    title: "Buriganga Bank Cleanup",
    type: "Cleanup",
    location: "Buriganga ghat, Old Dhaka",
    capacity: 80,
    attendees: 71,
    days: -13,
    image: photo("Buriganga Bank Cleanup (past).jpg"),
    description:
      "The biggest turn-out so far. Seventy-one volunteers cleared three ghats in four hours, filled 140 bags, and separated the recyclable plastic for a local buyer. The ghat caretakers joined us for the last hour.",
  },
  {
    title: "Uttara Sector 7 Tree Plantation",
    type: "Plantation",
    location: "Uttara Sector 7, Dhaka",
    capacity: 60,
    attendees: 47,
    days: -20,
    image: photo("Hatirjheel Tree Plantation past.jpg"),
    description:
      "We planted 120 saplings along the Sector 7 service road and fitted guards around each one. The local mosque committee has taken on the watering rota, and we will return in three months to check survival rates.",
  },
  {
    title: "Blankets for Mohammadpur Basti",
    type: "Donation",
    location: "Mohammadpur, Dhaka",
    capacity: 50,
    attendees: 44,
    days: -27,
    image: photo("Blankets for Mohammadpur Basti (past).jpg"),
    description:
      "Forty-four volunteers sorted and distributed 210 blankets across two lanes in Mohammadpur. Each bundle went to a household, not an individual, so families with children were covered first.",
  },
  {
    title: "Eid Clothes Collection",
    type: "Donation",
    location: "Mirpur 1, Dhaka",
    capacity: 70,
    attendees: 58,
    days: -34,
    image: photo("winter clothes donation bd 3.jpg"),
    description:
      "A week of collections ended with a single sorting day. We packed 340 outfits by size and age, repaired what we could, and sent the rest for textile recycling instead of the bin.",
  },
  {
    title: "Kamrangirchar Riverbank Cleanup",
    type: "Cleanup",
    location: "Kamrangirchar, Dhaka",
    capacity: 65,
    attendees: 49,
    days: -41,
    image: photo("river clean past.jpg"),
    description:
      "Forty-nine volunteers worked the riverbank at low tide. The strangest find was a full bicycle frame. We logged the waste types for the plastic audit and left the bank visibly clearer.",
  },
  {
    title: "Winter Study Camp",
    type: "Education",
    location: "Shahbagh, Dhaka",
    capacity: 30,
    attendees: 26,
    days: -55,
    image: photo("Winter Study Camp (past).jpg"),
    description:
      "A four-day study camp for 60 children during the school break. Twenty-six volunteers covered reading, maths and art, and every child left with a workbook and a library card.",
  },
  {
    title: "Tejgaon Community Garden Launch",
    type: "Plantation",
    location: "Tejgaon, Dhaka",
    capacity: 40,
    attendees: 31,
    days: -70,
    image: photo("Tejgaon Community Garden Launch (past).jpg"),
    description:
      "We turned an unused patch behind the Tejgaon community centre into twelve raised beds. Thirty-one people built, filled and planted them in a day. Six families now share the harvest.",
  },
  {
    title: "Jatrabari Drain Cleanup",
    type: "Cleanup",
    location: "Jatrabari, Dhaka",
    capacity: 55,
    attendees: 38,
    days: -90,
    image: photo("Jatrabari Drain Cleanup (past).jpg"),
    description:
      "The drain near the Jatrabari bus stand had not been cleared in years. Thirty-eight volunteers removed 90 bags of silt and plastic before the monsoon, working with the ward cleaners and their equipment.",
  },
  {
    title: "Blanket Drive — Old Dhaka",
    type: "Donation",
    location: "Old Dhaka",
    capacity: 60,
    attendees: 54,
    days: -120,
    image: photo("Blankets for Mohammadpur Basti (past).jpg"),
    description:
      "A winter collection across four Old Dhaka lanes. Fifty-four volunteers gathered 260 blankets and 90 jackets, sorted them at the Nawabpur community hall, and finished distribution before sunset.",
  },
  {
    title: "Gulshan Lake Cleanup",
    type: "Cleanup",
    location: "Gulshan 2 lake, Dhaka",
    capacity: 45,
    attendees: 32,
    days: -150,
    image: photo("gulshan-lake past.webp"),
    description:
      "Our first Gulshan sweep. Thirty-two volunteers cleared the east bank in two hours and found the same packaging brands we still see today. That morning led to the monthly sweep we now run.",
  },
  {
    title: "Book Drive — Mohammadpur",
    type: "Education",
    location: "Mohammadpur, Dhaka",
    capacity: 35,
    attendees: 21,
    days: -200,
    image: photo("School Kits donation bd 2.jpg"),
    description:
      "Twenty-one volunteers collected 480 books, sorted them by reading level, and stocked three small community libraries. The leftovers went to the school in Jatrabari we still work with.",
  },
  {
    title: "Cleaners' Story Session",
    type: "Education",
    location: "Dhanmondi, Dhaka",
    capacity: 25,
    attendees: 19,
    days: -240,
    image: photo("street children in bangladesh education 2.jpg"),
    description:
      "An afternoon with the waste workers who keep Dhanmondi clean. Nineteen volunteers listened, recorded eight oral histories, and helped publish a small booklet that is now used in two local schools.",
  },
  {
    title: "Monsoon Seedling Rescue",
    type: "Plantation",
    location: "Lalmatia, Dhaka",
    capacity: 50,
    attendees: 24,
    days: -300,
    image: photo("Rayer Bazar Tree Plantation past.jpg"),
    description:
      "Heavy rain had waterlogged the Lalmatia nursery beds. Twenty-four volunteers moved 300 seedlings to higher ground, rebuilt the drainage channels, and saved almost the whole batch.",
  },
];

function dhakaDate(daysFromNow: number) {
  const date = new Date();
  date.setUTCHours(4, 0, 0, 0); // 10:00 in Dhaka
  date.setUTCDate(date.getUTCDate() + daysFromNow);
  return date;
}

const seedEvents: Array<Omit<EventDocument, "_id" | "createdAt" | "updatedAt">> = seedRows.map((row) => ({
  title: row.title,
  type: row.type,
  location: row.location,
  capacity: row.capacity,
  image: row.image,
  description: row.description,
  date: dhakaDate(row.days),
  // Synthetic attendance so past events read like a real record. These are
  // numbers only; the joins collection stays empty until people actually join.
  attendeeCount: Math.min(row.attendees, row.capacity),
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
  const past = seedEvents.filter((event) => event.date.getTime() < Date.now()).length;
  console.log(
    `Seeded ${seedEvents.length} events (${seedEvents.length - past} upcoming, ${past} past): ` +
      `${result.upsertedCount} inserted, ${result.modifiedCount} updated.`,
  );
}

seed()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(closeDatabase);
