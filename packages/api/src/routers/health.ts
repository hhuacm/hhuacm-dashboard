import { arch, platform, release } from "node:os";
import { getNodeEnv } from "@hhuacm-dashboard/env/runtime";
import { version as bunVersion } from "bun";

import { publicProcedure } from "../index";

const serverStartedAt = new Date();

export const healthProcedure = publicProcedure.query(() => {
  const checkedAt = new Date();

  return {
    status: "ok",
    service: "hhuacm-dashboard API",
    checkedAt: checkedAt.toISOString(),
    uptimeMs: checkedAt.getTime() - serverStartedAt.getTime(),
    environment: getNodeEnv(),
    runtime: {
      name: "Bun",
      version: bunVersion,
    },
    system: {
      platform: platform(),
      arch: arch(),
      release: release(),
    },
  };
});
