import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { ZodError } from "zod";

import { env } from "./config/env.js";
import { connectDatabase } from "./db/connect.js";
import { eventRouter } from "./routes/event.routes.js";
import { joinRouter } from "./routes/join.routes.js";

const RATE_LIMIT_MESSAGE = "Too many requests. Please try again shortly.";

function createLimiter(windowMs: number, limit: number) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (request) => request.method === "OPTIONS",
    message: { success: false, message: RATE_LIMIT_MESSAGE },
  });
}

/** Applies a limiter only to POST/PATCH/DELETE so reads stay uncounted. */
function writesOnly(limiter: express.RequestHandler): express.RequestHandler {
  return (request, response, next) => {
    const isWrite = request.method === "POST" || request.method === "PATCH" || request.method === "DELETE";
    if (isWrite) {
      limiter(request, response, next);
      return;
    }
    next();
  };
}

export function createApp() {
  const app = express();
  const clientOrigin = env.CLIENT_ORIGIN.replace(/\/$/, "");
  // Vercel terminates TLS in front of the function, so trust one proxy hop.
  app.set("trust proxy", 1);
  app.use(helmet());
  app.use(cors({ origin: clientOrigin }));
  app.use(express.json({ limit: "100kb" }));
  app.use((request, _response, next) => {
    const startedAt = Date.now();
    next();
    console.log(`${request.method} ${request.originalUrl} ${Date.now() - startedAt}ms`);
  });

  app.use(createLimiter(15 * 60 * 1000, 300));

  app.get("/", (_request, response) => {
    response.json({ success: true, data: { service: "Shomaj Shathi API" } });
  });

  app.get("/api/health", (_request, response) => {
    response.json({ success: true, data: { status: "ok" } });
  });

  const withDatabase: express.RequestHandler = async (_request, _response, next) => {
    try {
      await connectDatabase(env.MONGODB_URI, env.MONGODB_DB);
      next();
    } catch (error) {
      next(error);
    }
  };

  app.use("/api/events", writesOnly(createLimiter(60 * 1000, 10)));
  app.use("/api/joins", writesOnly(createLimiter(60 * 1000, 10)));
  app.use("/api/events", withDatabase);
  app.use("/api/joins", withDatabase);

  app.use("/api/events", eventRouter);
  app.use("/api/joins", joinRouter);

  app.use((_request, response) => {
    response.status(404).json({ success: false, message: "Route not found." });
  });

  app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
    console.error(error);
    if (error instanceof ZodError) {
      response.status(400).json({ success: false, message: "Invalid request data.", issues: error.issues });
      return;
    }
    const statusCode = typeof error === "object" && error !== null && "statusCode" in error && typeof error.statusCode === "number"
      ? error.statusCode
      : 500;
    response.status(statusCode).json({ success: false, message: statusCode === 500 ? "Internal server error." : String(error instanceof Error ? error.message : error) });
  });

  return app;
}
