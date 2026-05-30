import { z } from "zod";

export const nodeEnvSchema = z
  .enum(["development", "production", "test"])
  .default("development");

export const getNodeEnv = () => nodeEnvSchema.parse(process.env.NODE_ENV);
