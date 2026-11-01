import { ObjectId } from "mongodb";
import { Router } from "express";
import { z } from "zod";

import { getDatabase } from "../db/connect.js";
import { toEventDto } from "../lib/to-event-dto.js";
import { eventTypes, type EventDocument } from "../models/event.model.js";
import type { EventWriteIdentity } from "../models/event.model.js";
import { env } from "../config/env.js";

const querySchema = z.object({
  scope: z.enum(["upcoming"]).default("upcoming"),
  limit: z.coerce.number().int().min(1).max(24).default(12),
  page: z.coerce.number().int().min(1).default(1),
  type: z.enum(eventTypes).optional(),
  q: z.string().trim().optional(),
  sort: z.enum(["date", "-date"]).default("date"),
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

function getWriteIdentity(request: import("express").Request): EventWriteIdentity | null {
  if (!env.ALLOW_ANON_WRITES) return null;
  const email = request.header("x-dev-email")?.trim().toLowerCase();
  if (!email || !z.string().email().safeParse(email).success) return null;
  const name = email.split("@")[0].replace(/[._-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
  return { id: `dev:${email}`, email, name };
}

function parseWriteInput(request: import("express").Request) {
  const input = eventWriteSchema.parse(request.body);
  if (input.date <= new Date()) {
    const error = new Error("Event date must be in the future.") as Error & { statusCode?: number };
    error.statusCode = 400;
    throw error;
  }
  return input;
}

function writeDisabled(response: import("express").Response) {
  response.status(401).json({ success: false, message: "Authentication is required for event management." });
}

eventRouter.get("/mine", async (request, response, next) => {
  try {
    const identity = getWriteIdentity(request);
    if (!identity) {
      writeDisabled(response);
      return;
    }
    const events = await getDatabase().collection<EventDocument>("events")
      .find({ organizerId: identity.id })
      .sort({ date: -1 })
      .toArray();
    response.json({ success: true, data: events.map(toEventDto) });
  } catch (error) {
    next(error);
  }
});

eventRouter.post("/", async (request, response, next) => {
  try {
    const identity = getWriteIdentity(request);
    if (!identity) {
      writeDisabled(response);
      return;
    }
    const input = parseWriteInput(request);
    const now = new Date();
    const event: EventDocument = {
      ...input,
      attendeeCount: 0,
      organizerId: identity.id,
      organizerEmail: identity.email,
      organizerName: identity.name,
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

eventRouter.get("/", async (request, response, next) => {
  try {
    const query = querySchema.parse(request.query);
    const filter: Record<string, unknown> = query.scope === "upcoming" ? { date: { $gte: new Date() } } : {};
    if (query.type) filter.type = query.type;
    if (query.q) {
      const search = query.q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.$or = [{ title: { $regex: search, $options: "i" } }, { location: { $regex: search, $options: "i" } }];
    }

    const collection = getDatabase().collection<EventDocument>("events");
    const total = await collection.countDocuments(filter);
    const events = await collection
      .find(filter)
      .sort({ date: query.sort === "-date" ? -1 : 1 })
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

eventRouter.patch("/:id", async (request, response, next) => {
  try {
    const identity = getWriteIdentity(request);
    if (!identity) {
      writeDisabled(response);
      return;
    }
    if (!ObjectId.isValid(request.params.id)) {
      response.status(404).json({ success: false, message: "Event not found." });
      return;
    }
    const input = parseWriteInput(request);
    const collection = getDatabase().collection<EventDocument>("events");
    const existing = await collection.findOne({ _id: new ObjectId(request.params.id) });
    if (!existing) {
      response.status(404).json({ success: false, message: "Event not found." });
      return;
    }
    if (existing.organizerId !== identity.id) {
      response.status(403).json({ success: false, message: "You can only manage your own events." });
      return;
    }
    await collection.updateOne({ _id: existing._id }, { $set: { ...input, updatedAt: new Date() } });
    const updated = await collection.findOne({ _id: existing._id });
    if (!updated) throw new Error("Updated event could not be loaded.");
    response.json({ success: true, data: toEventDto(updated) });
  } catch (error) {
    next(error);
  }
});

eventRouter.delete("/:id", async (request, response, next) => {
  try {
    const identity = getWriteIdentity(request);
    if (!identity) {
      writeDisabled(response);
      return;
    }
    if (!ObjectId.isValid(request.params.id)) {
      response.status(404).json({ success: false, message: "Event not found." });
      return;
    }
    const collection = getDatabase().collection<EventDocument>("events");
    const eventId = new ObjectId(request.params.id);
    const existing = await collection.findOne({ _id: eventId });
    if (!existing) {
      response.status(404).json({ success: false, message: "Event not found." });
      return;
    }
    if (existing.organizerId !== identity.id) {
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
    if (!ObjectId.isValid(request.params.id)) {
      response.status(404).json({ success: false, message: "Event not found." });
      return;
    }
    const event = await getDatabase().collection<EventDocument>("events").findOne({ _id: new ObjectId(request.params.id) });
    if (!event) {
      response.status(404).json({ success: false, message: "Event not found." });
      return;
    }
    response.json({ success: true, data: toEventDto(event) });
  } catch (error) {
    next(error);
  }
});
