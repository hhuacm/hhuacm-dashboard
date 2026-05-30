import { arch, platform, release } from "node:os";

import { getNodeEnv } from "@hhuacm-dashboard/env/runtime";

import { publicProcedure } from "../index";

const serverStartedAt = new Date();

const getBunRuntime = () => {
  const candidate: unknown = Reflect.get(globalThis, "Bun");

  if (typeof candidate !== "object" || candidate === null) {
    return null;
  }

  const version: unknown = Reflect.get(candidate, "version");

  if (typeof version !== "string") {
    return null;
  }

  return { version };
};

const getRuntimeName = () => {
  if (getBunRuntime()) {
    return "Bun";
  }

  return "Node.js";
};

const getRuntimeVersion = () => {
  const bunRuntime = getBunRuntime();

  if (bunRuntime) {
    return bunRuntime.version;
  }

  return process.version;
};

export const healthProcedure = publicProcedure.query(() => {
  const checkedAt = new Date();

  return {
    status: "ok",
    service: "hhuacm-dashboard API",
    checkedAt: checkedAt.toISOString(),
    uptimeMs: checkedAt.getTime() - serverStartedAt.getTime(),
    environment: getNodeEnv(),
    runtime: {
      name: getRuntimeName(),
      version: getRuntimeVersion(),
    },
    system: {
      platform: platform(),
      arch: arch(),
      release: release(),
    },
  };
});
