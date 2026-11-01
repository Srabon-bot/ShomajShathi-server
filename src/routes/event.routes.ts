import { Router } from "express";
import { z } from "zod";

import { EventModel, eventTypes } from "../models/event.model.js";
import { toEventDto } from "../lib/to-event-dto.js";

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
    const [events, total] = await Promise.all([
      EventModel.find(filter)
        .sort({ date: query.sort === "-date" ? -1 : 1 })
        .skip((query.page - 1) * query.limit)
        .limit(query.limit)
        .lean(),
      EventModel.countDocuments(filter),
    ]);
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
    if (!/^[a-f\d]{24}$/i.test(request.params.id)) {
      response.status(404).json({ success: false, message: "Event not found." });
      return;
    }
    const event = await EventModel.findById(request.params.id).lean();
    if (!event) {
      response.status(404).json({ success: false, message: "Event not found." });
      return;
    }
    response.json({ success: true, data: toEventDto(event) });
  } catch (error) {
    next(error);
  }
});
