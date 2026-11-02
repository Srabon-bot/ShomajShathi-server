import { ObjectId } from "mongodb";
import { Router } from "express";

import { getDatabase } from "../db/connect.js";
import { toEventDto } from "../lib/to-event-dto.js";
import { currentUser, requireAuth } from "../middleware/auth.js";
import type { EventDocument } from "../models/event.model.js";
import type { JoinDocument } from "../models/join.model.js";

export const joinRouter = Router();

let indexesReady: Promise<void> | undefined;

function joins() {
  return getDatabase().collection<JoinDocument>("joins");
}

function events() {
  return getDatabase().collection<EventDocument>("events");
}

function ensureIndexes() {
  if (!indexesReady) {
    indexesReady = joins()
      .createIndex({ eventId: 1, userId: 1 }, { unique: true })
      .then(() => undefined)
      .catch((error) => {
        indexesReady = undefined;
        throw error;
      });
  }
  return indexesReady;
}

function isDuplicateKey(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === 11000;
}

function notFound(response: import("express").Response) {
  response.status(404).json({ success: false, message: "Event not found." });
}

function param(request: import("express").Request, key: string) {
  const value = request.params[key];
  return Array.isArray(value) ? (value[0] ?? "") : value;
}

joinRouter.get("/mine", requireAuth, async (request, response, next) => {
  try {
    const user = currentUser(request);
    const rows = await joins().find({ userId: user.id }).sort({ createdAt: -1 }).toArray();
    if (!rows.length) {
      response.json({ success: true, data: [] });
      return;
    }
    const docs = await events()
      .find({ _id: { $in: rows.map((row) => row.eventId) } })
      .sort({ date: 1 })
      .toArray();
    response.json({ success: true, data: docs.map((event) => ({ ...toEventDto(event), joined: true })) });
  } catch (error) {
    next(error);
  }
});

joinRouter.get("/:eventId", requireAuth, async (request, response, next) => {
  try {
    if (!ObjectId.isValid(param(request, "eventId"))) {
      notFound(response);
      return;
    }
    const user = currentUser(request);
    const eventId = new ObjectId(param(request, "eventId"));
    const [event, join] = await Promise.all([
      events().findOne({ _id: eventId }),
      joins().findOne({ eventId, userId: user.id }),
    ]);
    if (!event) {
      notFound(response);
      return;
    }
    response.json({
      success: true,
      data: { joined: Boolean(join), attendeeCount: event.attendeeCount },
    });
  } catch (error) {
    next(error);
  }
});

joinRouter.post("/:eventId", requireAuth, async (request, response, next) => {
  try {
    if (!ObjectId.isValid(param(request, "eventId"))) {
      notFound(response);
      return;
    }
    await ensureIndexes();

    const user = currentUser(request);
    const eventId = new ObjectId(param(request, "eventId"));
    const event = await events().findOne({ _id: eventId });
    if (!event) {
      notFound(response);
      return;
    }
    if (event.date.getTime() < Date.now()) {
      response.status(409).json({ success: false, message: "This event has already taken place." });
      return;
    }
    if (event.attendeeCount >= event.capacity) {
      response.status(409).json({ success: false, message: "This event is full." });
      return;
    }

    try {
      await joins().insertOne({
        eventId,
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        userImage: user.image,
        createdAt: new Date(),
      });
    } catch (error) {
      if (isDuplicateKey(error)) {
        response.status(409).json({ success: false, message: "You have already joined this event." });
        return;
      }
      throw error;
    }

    const updated = await events().findOneAndUpdate(
      { _id: eventId, attendeeCount: { $lt: event.capacity } },
      { $inc: { attendeeCount: 1 } },
      { returnDocument: "after" },
    );

    if (!updated) {
      // The event filled up between the read and the write.
      await joins().deleteOne({ eventId, userId: user.id });
      response.status(409).json({ success: false, message: "This event is full." });
      return;
    }

    response.status(201).json({
      success: true,
      data: { joined: true, attendeeCount: updated.attendeeCount },
    });
  } catch (error) {
    next(error);
  }
});

joinRouter.delete("/:eventId", requireAuth, async (request, response, next) => {
  try {
    if (!ObjectId.isValid(param(request, "eventId"))) {
      notFound(response);
      return;
    }
    const user = currentUser(request);
    const eventId = new ObjectId(param(request, "eventId"));

    const event = await events().findOne({ _id: eventId }, { projection: { date: 1 } });
    if (!event) {
      notFound(response);
      return;
    }
    if (event.date.getTime() < Date.now()) {
      response.status(409).json({ success: false, message: "This event has already taken place." });
      return;
    }

    const result = await joins().deleteOne({ eventId, userId: user.id });
    if (!result.deletedCount) {
      response.status(404).json({ success: false, message: "You have not joined this event." });
      return;
    }

    const updated = await events().findOneAndUpdate(
      { _id: eventId, attendeeCount: { $gt: 0 } },
      { $inc: { attendeeCount: -1 } },
      { returnDocument: "after" },
    );

    response.json({
      success: true,
      data: { joined: false, attendeeCount: updated?.attendeeCount ?? 0 },
    });
  } catch (error) {
    next(error);
  }
});
