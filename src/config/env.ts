import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(5000),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  MONGODB_URI: z.string().min(1),
  MONGODB_DB: z.string().min(1).default("shomaj_shathi"),
  CLIENT_ORIGIN: z.string().url().default("http://localhost:3000"),
});

export const env = envSchema.parse(process.env);
