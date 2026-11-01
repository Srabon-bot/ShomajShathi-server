import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(5000),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  MONGODB_URI: z.string().min(1),
  CLIENT_ORIGIN: z.string().url(),
  BETTER_AUTH_JWKS_URL: z.string().url(),
  BETTER_AUTH_ISSUER: z.string().url(),
  BETTER_AUTH_AUDIENCE: z.string().url(),
  ALLOW_ANON_WRITES: z.enum(["true", "false"]).default("false").transform((value) => value === "true"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment configuration", parsed.error.flatten().fieldErrors);
  throw new Error("Invalid environment configuration");
}

export const env = parsed.data;
