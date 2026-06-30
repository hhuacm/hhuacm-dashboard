import "dotenv/config";
import { z } from "zod";
import { parseEnv } from "./parse-env";

export const env = parseEnv({
  DATABASE_URL: z.string().min(1),
  DATABASE_AUTH_TOKEN: z.string().optional(),
});
