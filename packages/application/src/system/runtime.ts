import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

export const workspaceRoot = fileURLToPath(
  new URL("../../../../", import.meta.url)
);

export const webEnvPath = path.join(workspaceRoot, "apps/web/.env");

export const loadWebEnv = () => {
  dotenv.config({
    path: webEnvPath,
    quiet: true,
  });
};
