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
  runtimeInfo: publicProcedure.query(() => ({
    service: "hhuacm-dashboard API",
    runtime: getRuntimeName(),
    version: getRuntimeVersion(),
    environment: process.env.NODE_ENV ?? "development",
    startedAt: serverStartedAt.toISOString(),
    checkedAt: new Date().toISOString(),
  })),
});
export type AppRouter = typeof appRouter;
