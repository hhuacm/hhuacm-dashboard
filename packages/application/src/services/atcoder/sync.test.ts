import { describe, expect, it } from "bun:test";
import { atcoderAccountStats } from "@hhuacm-dashboard/db/schema/atcoder-account-stats";
import { user } from "@hhuacm-dashboard/db/schema/auth";
import { userOjAccount } from "@hhuacm-dashboard/db/schema/oj-account";

import type { AtCoderUserHistory } from "../../external/online-judge-sources/atcoder/api";
import { createServiceTestDb } from "../test-db";
import {
  markAtcoderAccountStatsRefreshFailed,
  syncAtcoderAccountStats,
} from "./sync";

const createHistoryItem = (
  input: Partial<AtCoderUserHistory[number]>
): AtCoderUserHistory[number] => ({
  ContestName: input.ContestName ?? "AtCoder Beginner Contest",
  ContestNameEn: input.ContestNameEn ?? "AtCoder Beginner Contest",
  ContestScreenName: input.ContestScreenName ?? "abc001",
  EndTime: input.EndTime ?? "2026-01-01T22:40:00+09:00",
  InnerPerformance: input.InnerPerformance ?? input.Performance ?? 0,
  IsRated: input.IsRated ?? true,
  NewRating: input.NewRating ?? 0,
  OldRating: input.OldRating ?? 0,
  Performance: input.Performance ?? 0,
  Place: input.Place ?? 1,
});

const createAtcoderAccount = async (
  db: Awaited<ReturnType<typeof createServiceTestDb>>
) => {
  await db.insert(user).values({
    email: "atcoder@example.com",
    id: "user-atcoder",
    name: "atcoder",
    username: "atcoder",
  });
  await db.insert(userOjAccount).values({
    externalId: "forlight",
    handle: "forlight",
    id: "account-atcoder",
    platform: "atcoder",
    userId: "user-atcoder",
  });

  return {
    externalId: "forlight",
    handle: "forlight",
    id: "account-atcoder",
  };
};

describe("AtCoder sync", () => {
  it("writes latest rated rating and recent rated performance average", async () => {
    const db = await createServiceTestDb();
    const account = await createAtcoderAccount(db);
    const now = new Date("2026-01-04T00:00:00.000Z");

    await syncAtcoderAccountStats(db, account, now, async () => [
      createHistoryItem({
        ContestScreenName: "abc-old",
        EndTime: "2026-01-01T22:40:00+09:00",
        NewRating: 300,
        Performance: 300,
      }),
      createHistoryItem({
        ContestScreenName: "abc-newest-unrated",
        EndTime: "2026-01-04T22:40:00+09:00",
        IsRated: false,
        NewRating: 999,
        Performance: 999,
      }),
      createHistoryItem({
        ContestScreenName: "abc-mid",
        EndTime: "2026-01-02T22:40:00+09:00",
        NewRating: 450,
        Performance: 451,
      }),
      createHistoryItem({
        ContestScreenName: "abc-newest-rated",
        EndTime: "2026-01-03T22:40:00+09:00",
        NewRating: 584,
        Performance: 711,
      }),
      createHistoryItem({
        ContestScreenName: "abc-oldest",
        EndTime: "2025-12-31T22:40:00+09:00",
        NewRating: 200,
        Performance: 200,
      }),
    ]);

    const [stats] = await db.select().from(atcoderAccountStats);

    expect(stats?.rating).toBe(584);
    expect(stats?.recentPerformanceAverage).toBe(
      Math.floor((711 + 451 + 300) / 3)
    );
    expect(stats?.fetchedAt?.toISOString()).toBe(now.toISOString());
    expect(stats?.lastError).toBeNull();
  });

  it("writes null stats when there are no rated contests", async () => {
    const db = await createServiceTestDb();
    const account = await createAtcoderAccount(db);

    await syncAtcoderAccountStats(
      db,
      account,
      new Date("2026-01-01T00:00:00.000Z"),
      async () => [
        createHistoryItem({
          IsRated: false,
          NewRating: 999,
          Performance: 999,
        }),
      ]
    );

    const [stats] = await db.select().from(atcoderAccountStats);

    expect(stats?.rating).toBeNull();
    expect(stats?.recentPerformanceAverage).toBeNull();
  });

  it("records failures without overwriting fetched stats", async () => {
    const db = await createServiceTestDb();
    const account = await createAtcoderAccount(db);
    const fetchedAt = new Date("2026-01-01T00:00:00.000Z");
    const failedAt = new Date("2026-01-02T00:00:00.000Z");

    await syncAtcoderAccountStats(db, account, fetchedAt, async () => [
      createHistoryItem({ NewRating: 584, Performance: 711 }),
    ]);
    await markAtcoderAccountStatsRefreshFailed(
      db,
      account,
      new Error("network failed"),
      failedAt
    );

    const [stats] = await db.select().from(atcoderAccountStats);

    expect(stats?.rating).toBe(584);
    expect(stats?.fetchedAt?.toISOString()).toBe(fetchedAt.toISOString());
    expect(stats?.lastAttemptedAt.toISOString()).toBe(failedAt.toISOString());
    expect(stats?.lastError).toBe("network failed");
  });
});
