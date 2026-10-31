import "dotenv/config";

import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { connectDatabase } from "./db/connect.js";

const app = createApp();

async function start() {
  if (env.MONGODB_URI) await connectDatabase(env.MONGODB_URI);
  app.listen(env.PORT, () => console.log(`Uddom API listening on port ${env.PORT}`));
}

start().catch((error: unknown) => {
  console.error("Unable to start Uddom API", error);
  process.exitCode = 1;
});
