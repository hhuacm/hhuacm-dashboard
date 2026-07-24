import { z } from "zod";

export const nodeEnvSchema = z
  .enum(["development", "production", "test"])
  .default("development");

export const getNodeEnv = () => nodeEnvSchema.parse(process.env.NODE_ENV);

export const getBuildMetadata = () => ({
  committedAt: process.env.APP_COMMITTED_AT || null,
  revision: process.env.APP_REVISION || "local",
});
