import { app } from "./app.js";
import { env } from "./config/env.js";
import { connectDatabase } from "./db/connect.js";

await connectDatabase();
app.listen(env.PORT, () => {
  console.info(`Shomaj Shathi API listening on port ${env.PORT}`);
});
