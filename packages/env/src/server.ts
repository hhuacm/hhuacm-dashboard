import "dotenv/config";
import { z } from "zod";
import { parseEnv } from "./parse-env";
import { nodeEnvSchema } from "./runtime";

export const env = parseEnv({
  DATABASE_URL: z.string().min(1),
  DATABASE_AUTH_TOKEN: z.string().optional(),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.url(),
  CORS_ORIGIN: z.url(),
  NODE_ENV: nodeEnvSchema,
  PORT: z.coerce.number().int().positive().default(3000),
});
