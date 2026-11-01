import cors from "cors";
import express from "express";
import helmet from "helmet";

import { env } from "./config/env.js";
import { connectDatabase } from "./db/connect.js";
import { eventRouter } from "./routes/event.routes.js";

export function createApp() {
  const app = express();
  const clientOrigin = env.CLIENT_ORIGIN.replace(/\/$/, "");
  app.use(helmet());
  app.use(cors({ origin: clientOrigin }));
  app.use(express.json({ limit: "100kb" }));
  app.use((request, _response, next) => {
    const startedAt = Date.now();
    next();
    console.log(`${request.method} ${request.originalUrl} ${Date.now() - startedAt}ms`);
  });

  app.get("/", (_request, response) => {
    response.json({ success: true, data: { service: "Shomaj Shathi API" } });
  });

  app.get("/api/health", (_request, response) => {
    response.json({ success: true, data: { status: "ok" } });
  });

  app.use("/api/events", async (_request, _response, next) => {
    try {
      await connectDatabase(env.MONGODB_URI, env.MONGODB_DB);
      next();
    } catch (error) {
      next(error);
    }
  });

  app.use("/api/events", eventRouter);

  app.use((_request, response) => {
    response.status(404).json({ success: false, message: "Route not found." });
  });

  app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
    console.error(error);
    response.status(500).json({ success: false, message: "Internal server error." });
  });

  return app;
}
