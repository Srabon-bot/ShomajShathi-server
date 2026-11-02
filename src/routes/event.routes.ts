import { ObjectId } from "mongodb";
import { Router } from "express";
import { z } from "zod";

import { getDatabase } from "../db/connect.js";
import { toEventDto } from "../lib/to-event-dto.js";
import { currentUser, requireAuth } from "../middleware/auth.js";
import { eventTypes, type EventDocument } from "../models/event.model.js";

const querySchema = z.object({
  scope: z.enum(["upcoming", "past"]).default("upcoming"),
  limit: z.coerce.number().int().min(1).max(24).default(12),
  page: z.coerce.number().int().min(1).default(1),
  type: z.enum(eventTypes).optional(),
  q: z.string().trim().optional(),
  sort: z.enum(["date", "-date"]).optional(),
});

export const eventRouter = Router();

const eventWriteSchema = z.object({
  title: z.string().trim().min(6).max(90),
  description: z.string().trim().min(20).max(2000),
  type: z.enum(eventTypes),
  image: z.string().url().refine((value) => /^https?:\/\//.test(value), "Image must use http or https."),
  location: z.string().trim().min(3).max(120),
  date: z.coerce.date(),
  capacity: z.coerce.number().int().min(1).max(1000).default(50),
});

function parseWriteInput(request: import("express").Request) {
  return eventWriteSchema.parse(request.body);
}

function assertFuture(date: Date) {
  if (date <= new Date()) {
    const error = new Error("Event date must be in the future.") as Error & { statusCode?: number };
    error.statusCode = 400;
    throw error;
  }
}

function param(request: import("express").Request, key: string) {
  const value = request.params[key];
  return Array.isArray(value) ? (value[0] ?? "") : value;
}

eventRouter.get("/mine", requireAuth, async (request, response, next) => {
  try {
    const user = currentUser(request);
    const events = await getDatabase().collection<EventDocument>("events")
      .find({ organizerId: user.id })
      .sort({ date: -1 })
      .toArray();
    response.json({ success: true, data: events.map(toEventDto) });
  } catch (error) {
    next(error);
  }
});

eventRouter.post("/", requireAuth, async (request, response, next) => {
  try {
    const user = currentUser(request);
    const input = parseWriteInput(request);
    assertFuture(input.date);
    const now = new Date();
    const event: EventDocument = {
      ...input,
      attendeeCount: 0,
      organizerId: user.id,
      organizerEmail: user.email,
      organizerName: user.name,
      organizerImage: user.image,
      createdAt: now,
      updatedAt: now,
    };
    const result = await getDatabase().collection<EventDocument>("events").insertOne(event);
    const created = await getDatabase().collection<EventDocument>("events").findOne({ _id: result.insertedId });
    if (!created) throw new Error("Created event could not be loaded.");
    response.status(201).json({ success: true, data: toEventDto(created) });
  } catch (error) {
    next(error);
  }
});

eventRouter.get("/stats", async (_request, response, next) => {
  try {
    const now = new Date();
    const collection = getDatabase().collection<EventDocument>("events");
    const [pastEvents, upcomingEvents, totals, nextEvent] = await Promise.all([
      collection.countDocuments({ date: { $lt: now } }),
      collection.countDocuments({ date: { $gte: now } }),
      collection
        .aggregate<{ volunteers: number }>([
          { $match: { date: { $lt: now } } },
          { $group: { _id: null, volunteers: { $sum: "$attendeeCount" } } },
        ])
        .toArray(),
      collection.find({ date: { $gte: now } }).sort({ date: 1 }).limit(1).next(),
    ]);

    response.json({
      success: true,
      data: {
        pastEvents,
        upcomingEvents,
        volunteers: totals[0]?.volunteers ?? 0,
        nextEventDate: nextEvent?.date.toISOString() ?? null,
      },
    });
  } catch (error) {
    next(error);
  }
});

eventRouter.get("/", async (request, response, next) => {
  try {
    const query = querySchema.parse(request.query);
    const now = new Date();
    const filter: Record<string, unknown> = { date: query.scope === "past" ? { $lt: now } : { $gte: now } };
    if (query.type) filter.type = query.type;
    if (query.q) {
      const search = query.q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.$or = [{ title: { $regex: search, $options: "i" } }, { location: { $regex: search, $options: "i" } }];
    }

    const sort = query.sort ?? (query.scope === "past" ? "-date" : "date");
    const collection = getDatabase().collection<EventDocument>("events");
    const total = await collection.countDocuments(filter);
    const events = await collection
      .find(filter)
      .sort({ date: sort === "-date" ? -1 : 1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit)
      .toArray();

    response.json({
      success: true,
      data: events.map(toEventDto),
      meta: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
    });
  } catch (error) {
    next(error);
  }
});

eventRouter.patch("/:id", requireAuth, async (request, response, next) => {
  try {
    const user = currentUser(request);
    if (!ObjectId.isValid(param(request, "id"))) {
      response.status(404).json({ success: false, message: "Event not found." });
      return;
    }
    const input = parseWriteInput(request);
    const collection = getDatabase().collection<EventDocument>("events");
    const existing = await collection.findOne({ _id: new ObjectId(param(request, "id")) });
    if (!existing) {
      response.status(404).json({ success: false, message: "Event not found." });
      return;
    }
    if (existing.organizerId !== user.id) {
      response.status(403).json({ success: false, message: "You can only manage your own events." });
      return;
    }
    // Events that have already happened are historical records, so they may be
    // edited without a future date. Upcoming events must stay in the future.
    if (existing.date.getTime() >= Date.now()) assertFuture(input.date);
    await collection.updateOne({ _id: existing._id }, { $set: { ...input, updatedAt: new Date() } });
    const updated = await collection.findOne({ _id: existing._id });
    if (!updated) throw new Error("Updated event could not be loaded.");
    response.json({ success: true, data: toEventDto(updated) });
  } catch (error) {
    next(error);
  }
});

eventRouter.delete("/:id", requireAuth, async (request, response, next) => {
  try {
    const user = currentUser(request);
    if (!ObjectId.isValid(param(request, "id"))) {
      response.status(404).json({ success: false, message: "Event not found." });
      return;
    }
    const collection = getDatabase().collection<EventDocument>("events");
    const eventId = new ObjectId(param(request, "id"));
    const existing = await collection.findOne({ _id: eventId });
    if (!existing) {
      response.status(404).json({ success: false, message: "Event not found." });
      return;
    }
    if (existing.organizerId !== user.id) {
      response.status(403).json({ success: false, message: "You can only manage your own events." });
      return;
    }
    await collection.deleteOne({ _id: eventId });
    await getDatabase().collection("joins").deleteMany({ eventId });
    response.status(204).send();
  } catch (error) {
    next(error);
  }
});

eventRouter.get("/:id", async (request, response, next) => {
  try {
    if (!ObjectId.isValid(param(request, "id"))) {
      response.status(404).json({ success: false, message: "Event not found." });
      return;
    }
    const event = await getDatabase().collection<EventDocument>("events").findOne({ _id: new ObjectId(param(request, "id")) });
    if (!event) {
      response.status(404).json({ success: false, message: "Event not found." });
      return;
    }
    response.json({ success: true, data: toEventDto(event) });
  } catch (error) {
    next(error);
  }
});
