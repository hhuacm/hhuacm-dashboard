import { describe, expect, it } from "bun:test";

import type { Context } from "../../context";
import { codeforcesAccountStatsJob } from "./jobs/codeforces-account-stats";
import type { RefreshJobDefinition } from "./jobs/definition";
import { enqueueDueRefreshTargets } from "./runtime";

const fakeDb = null as unknown as Context["db"];

describe("refresh runtime", () => {
  it("enqueues due targets across definitions", async () => {
    const definitions = [
      {
        enqueueDueTargets: async (_db, now) =>
          now.toISOString() === "2026-01-01T00:00:00.000Z" ? 2 : 0,
        clear: codeforcesAccountStatsJob.clear,
        enqueue: codeforcesAccountStatsJob.enqueue,
        handle: () => Promise.resolve(undefined),
        kind: codeforcesAccountStatsJob.kind,
      },
    ] satisfies RefreshJobDefinition[];

    await expect(
      enqueueDueRefreshTargets(
        fakeDb,
        definitions,
        new Date("2026-01-01T00:00:00.000Z")
      )
    ).resolves.toBe(2);
  });

  it("skips event-driven definitions without due scans", async () => {
    const definitions = [
      {
        clear: codeforcesAccountStatsJob.clear,
        enqueue: codeforcesAccountStatsJob.enqueue,
        handle: () => Promise.resolve(undefined),
        kind: codeforcesAccountStatsJob.kind,
      },
    ] satisfies RefreshJobDefinition[];

    await expect(enqueueDueRefreshTargets(fakeDb, definitions)).resolves.toBe(
      0
    );
  });
});
