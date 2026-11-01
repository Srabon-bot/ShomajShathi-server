import { ObjectId } from "mongodb";
import { Router } from "express";
import { z } from "zod";

import { getDatabase } from "../db/connect.js";
import { toEventDto } from "../lib/to-event-dto.js";
import { eventTypes, type EventDocument } from "../models/event.model.js";

const querySchema = z.object({
  scope: z.enum(["upcoming"]).default("upcoming"),
  limit: z.coerce.number().int().min(1).max(24).default(12),
  page: z.coerce.number().int().min(1).default(1),
  type: z.enum(eventTypes).optional(),
  q: z.string().trim().optional(),
  sort: z.enum(["date", "-date"]).default("date"),
});

export const eventRouter = Router();

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
