import { z } from "zod";
import { parseEnv } from "./parse-env";
import { nodeEnvSchema } from "./runtime";

const localServerUrl = "http://localhost:3000";

export const getWebServerEnv = () =>
  parseEnv(
    {
      NODE_ENV: nodeEnvSchema,
      SERVER_INTERNAL_URL: z.url().optional(),
    },
    {
      NODE_ENV: process.env.NODE_ENV,
      SERVER_INTERNAL_URL: process.env.SERVER_INTERNAL_URL,
    }
  );

export const getServerInternalUrl = () => {
  const { NODE_ENV, SERVER_INTERNAL_URL } = getWebServerEnv();

  if (SERVER_INTERNAL_URL) {
    return SERVER_INTERNAL_URL;
  }

  if (NODE_ENV === "production") {
    throw new Error("SERVER_INTERNAL_URL is required in production.");
  }

  return localServerUrl;
};

export const shouldUseLocalWebApiRewrites = () =>
  getWebServerEnv().NODE_ENV !== "production";

export const getServerTrpcUrl = () =>
  new URL("/trpc", getServerInternalUrl()).toString();
