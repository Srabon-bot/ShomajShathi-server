import cors from "cors";
import express from "express";
import helmet from "helmet";

import { env } from "./config/env.js";
import { eventRouter } from "./routes/event.routes.js";

export function createApp() {
  const app = express();
  app.use(helmet());
  app.use(cors({ origin: env.CLIENT_ORIGIN }));
  app.use(express.json({ limit: "100kb" }));
  app.use((request, _response, next) => {
    const startedAt = Date.now();
    next();
    console.log(`${request.method} ${request.originalUrl} ${Date.now() - startedAt}ms`);
  });

  app.get("/api/health", (_request, response) => {
    response.json({ success: true, data: { status: "ok" } });
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
