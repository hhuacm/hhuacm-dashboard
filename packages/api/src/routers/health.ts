import { arch, platform, release } from "node:os";
import { getBuildMetadata, getNodeEnv } from "@hhuacm-dashboard/env/runtime";
import { version as bunVersion } from "bun";

import { publicProcedure } from "../index";

const serverStartedAt = new Date();

export const healthProcedure = publicProcedure.query(() => ({
  status: "ok",
  service: "hhuacm-dashboard API",
  build: getBuildMetadata(),
  uptimeMs: Date.now() - serverStartedAt.getTime(),
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
}));
