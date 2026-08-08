import "dotenv/config";
import { z } from "zod";
import { parseEnv } from "./parse-env";

export const getAuthEnv = () =>
  parseEnv({
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.url(),
  });
