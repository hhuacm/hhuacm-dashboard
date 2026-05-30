import "dotenv/config";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";
import { nodeEnvSchema } from "./runtime";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().min(1),
    DATABASE_AUTH_TOKEN: z.string().optional(),
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.url(),
    CORS_ORIGIN: z.url(),
    NODE_ENV: nodeEnvSchema,
    PORT: z.coerce.number().int().positive().default(3000),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
