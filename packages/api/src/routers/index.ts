import { arch, platform, release } from "node:os";

import { publicProcedure, router } from "../index";

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

export const appRouter = router({
  health: publicProcedure.query(() => {
    const checkedAt = new Date();

    return {
      status: "ok",
      service: "hhuacm-dashboard API",
      checkedAt: checkedAt.toISOString(),
      uptimeMs: checkedAt.getTime() - serverStartedAt.getTime(),
      environment: process.env.NODE_ENV ?? "development",
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
  }),
});
export type AppRouter = typeof appRouter;
