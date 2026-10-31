import cors from "cors";
import express from "express";
import helmet from "helmet";

import { eventRouter } from "./routes/event.routes.js";

export function createApp() {
  const app = express();
  const allowedOrigin = process.env.CLIENT_ORIGIN ?? "http://localhost:3000";

  app.use(helmet());
  app.use(cors({ origin: allowedOrigin }));
  app.use(express.json({ limit: "100kb" }));

  app.get("/api/health", (_request, response) => {
    response.json({ success: true, data: { status: "ok" } });
  });

  app.use("/api/events", eventRouter);

  app.use((_request, response) => {
    response.status(404).json({ success: false, message: "Route not found." });
  });

  return app;
}
