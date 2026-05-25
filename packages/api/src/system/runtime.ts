import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

export const workspaceRoot = fileURLToPath(
  new URL("../../../../", import.meta.url)
);

export const serverEnvPath = path.join(workspaceRoot, "apps/server/.env");

export const loadServerEnv = () => {
  dotenv.config({
    path: serverEnvPath,
    quiet: true,
  });
};
