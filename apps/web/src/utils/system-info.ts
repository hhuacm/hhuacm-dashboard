import "server-only";

import { arch, platform, release } from "node:os";

const serverStartedAt = Date.now();

export function getSystemInfo() {
  return {
    service: "hhuacm-dashboard Web",
    build: {
      committedAt: process.env.APP_COMMITTED_AT || null,
      revision: process.env.APP_REVISION || "local",
    },
    uptimeMs: Date.now() - serverStartedAt,
    runtime: {
      name: "Bun",
      version: process.versions.bun,
    },
    system: {
      platform: platform(),
      arch: arch(),
      release: release(),
    },
  };
}
