import { describe, expect, it } from "bun:test";

import type { Context } from "../../context";
import { codeforcesAccountStatsJobKind } from "./job-types";
import type { RefreshJobDefinition } from "./registry";
import { scanStaleRefreshTargets } from "./runtime";

const fakeDb = null as unknown as Context["db"];

describe("refresh runtime", () => {
  it("runs stale scans across definitions", async () => {
    const definitions = [
      {
        handle: () => Promise.resolve(undefined),
        kind: codeforcesAccountStatsJobKind,
        scanStaleTargets: async (_db, now) =>
          now.toISOString() === "2026-01-01T00:00:00.000Z" ? 2 : 0,
      },
    ] satisfies RefreshJobDefinition[];

    await expect(
      scanStaleRefreshTargets(
        fakeDb,
        definitions,
        new Date("2026-01-01T00:00:00.000Z")
      )
    ).resolves.toBe(2);
  });

  it("skips event-driven definitions without stale scans", async () => {
    const definitions = [
      {
        handle: () => Promise.resolve(undefined),
        kind: codeforcesAccountStatsJobKind,
      },
    ] satisfies RefreshJobDefinition[];

    await expect(scanStaleRefreshTargets(fakeDb, definitions)).resolves.toBe(0);
  });
});
