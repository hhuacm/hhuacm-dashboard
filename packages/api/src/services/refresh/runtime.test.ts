import { describe, expect, it } from "bun:test";

import type { Context } from "../../context";
import type { RefreshRequestDefinition } from "./registry";
import { codeforcesAccountStatsRequestKind } from "./request-types";
import { enqueueDueRefreshTargets } from "./runtime";

const fakeDb = null as unknown as Context["db"];

describe("refresh runtime", () => {
  it("enqueues due targets across definitions", async () => {
    const definitions = [
      {
        enqueueDueTargets: async (_db, now) =>
          now.toISOString() === "2026-01-01T00:00:00.000Z" ? 2 : 0,
        handle: () => Promise.resolve(undefined),
        kind: codeforcesAccountStatsRequestKind,
      },
    ] satisfies RefreshRequestDefinition[];

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
        handle: () => Promise.resolve(undefined),
        kind: codeforcesAccountStatsRequestKind,
      },
    ] satisfies RefreshRequestDefinition[];

    await expect(enqueueDueRefreshTargets(fakeDb, definitions)).resolves.toBe(
      0
    );
  });
});
