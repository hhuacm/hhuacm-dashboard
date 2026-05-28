import { describe, expect, it } from "bun:test";
import { user } from "@hhuacm-dashboard/db/schema/auth";
import { nowcoderAccountStats } from "@hhuacm-dashboard/db/schema/nowcoder-account-stats";
import { userOjAccount } from "@hhuacm-dashboard/db/schema/oj-account";

import type { NowcoderRatingBasic } from "../../external/online-judge-sources/nowcoder/api";
import { createServiceTestDb } from "../test-db";
import {
  markNowcoderAccountStatsRefreshFailed,
  syncNowcoderAccountStats,
} from "./sync";

const createRatingBasic = (
  input: Partial<NowcoderRatingBasic> = {}
): NowcoderRatingBasic => ({
  allRatedCount: input.allRatedCount ?? 32,
  colorLevel: input.colorLevel ?? 4,
  contestCount: input.contestCount ?? 72,
  followedCount: input.followedCount ?? 8,
  followingCount: input.followingCount ?? 7,
  hasRank: input.hasRank ?? false,
  hasRating: input.hasRating ?? true,
  isFollowedByHost: input.isFollowedByHost ?? false,
  isHostSelf: input.isHostSelf ?? false,
  nickname: input.nickname ?? "F0rL1ght",
  rank: input.rank ?? -1,
  ratedCount: input.ratedCount ?? 17,
  rating: input.rating ?? 1609,
  school: input.school ?? "HHU",
  teamRatedCount: input.teamRatedCount ?? 15,
  tinnyHeaderUrl: input.tinnyHeaderUrl ?? "",
  uid: input.uid ?? 660_255_087,
});

const createNowcoderAccount = async (
  db: Awaited<ReturnType<typeof createServiceTestDb>>,
  externalId = "660255087"
) => {
  await db.insert(user).values({
    email: `${externalId}@example.com`,
    id: `user-${externalId}`,
    name: externalId,
    username: externalId,
  });
  await db.insert(userOjAccount).values({
    externalId,
    handle: "old-handle",
    id: `account-${externalId}`,
    platform: "nowcoder",
    userId: `user-${externalId}`,
  });

  return {
    externalId,
    handle: "old-handle",
    id: `account-${externalId}`,
  };
};

describe("Nowcoder sync", () => {
  it("writes rating, accepted problem count, and canonical nickname", async () => {
    const db = await createServiceTestDb();
    const account = await createNowcoderAccount(db);
    const now = new Date("2026-01-01T00:00:00.000Z");

    await syncNowcoderAccountStats(db, account, now, {
      loadAcceptedPracticeProblemCount: async () => 312,
      loadRatingBasic: async () => createRatingBasic({ rating: 1609.5 }),
    });

    const [stats] = await db.select().from(nowcoderAccountStats);
    const [ojAccount] = await db.select().from(userOjAccount);

    expect(stats?.rating).toBe(1609.5);
    expect(stats?.acceptedProblemCount).toBe(312);
    expect(stats?.fetchedAt?.toISOString()).toBe(now.toISOString());
    expect(stats?.lastError).toBeNull();
    expect(ojAccount?.handle).toBe("F0rL1ght");
  });

  it("keeps existing accepted problem count when the practice page has no new count", async () => {
    const db = await createServiceTestDb();
    const account = await createNowcoderAccount(db);

    await syncNowcoderAccountStats(
      db,
      account,
      new Date("2026-01-01T00:00:00.000Z"),
      {
        loadAcceptedPracticeProblemCount: async () => 312,
        loadRatingBasic: async () => createRatingBasic({ rating: 1609 }),
      }
    );
    await syncNowcoderAccountStats(
      db,
      { ...account, handle: "F0rL1ght" },
      new Date("2026-01-02T00:00:00.000Z"),
      {
        loadAcceptedPracticeProblemCount: async () => null,
        loadRatingBasic: async () => createRatingBasic({ rating: 1610 }),
      }
    );

    const [stats] = await db.select().from(nowcoderAccountStats);

    expect(stats?.rating).toBe(1610);
    expect(stats?.acceptedProblemCount).toBe(312);
  });

  it("keeps existing accepted problem count when the practice page request fails", async () => {
    const db = await createServiceTestDb();
    const account = await createNowcoderAccount(db);

    await syncNowcoderAccountStats(
      db,
      account,
      new Date("2026-01-01T00:00:00.000Z"),
      {
        loadAcceptedPracticeProblemCount: async () => 312,
        loadRatingBasic: async () => createRatingBasic({ rating: 1609 }),
      }
    );
    await syncNowcoderAccountStats(
      db,
      { ...account, handle: "F0rL1ght" },
      new Date("2026-01-02T00:00:00.000Z"),
      {
        loadAcceptedPracticeProblemCount: () =>
          Promise.reject(new Error("practice failed")),
        loadRatingBasic: async () => createRatingBasic({ rating: 1610 }),
      }
    );

    const [stats] = await db.select().from(nowcoderAccountStats);

    expect(stats?.rating).toBe(1610);
    expect(stats?.acceptedProblemCount).toBe(312);
    expect(stats?.lastError).toBeNull();
  });

  it("records failures without overwriting fetched stats", async () => {
    const db = await createServiceTestDb();
    const account = await createNowcoderAccount(db);
    const fetchedAt = new Date("2026-01-01T00:00:00.000Z");
    const failedAt = new Date("2026-01-02T00:00:00.000Z");

    await syncNowcoderAccountStats(db, account, fetchedAt, {
      loadAcceptedPracticeProblemCount: async () => 312,
      loadRatingBasic: async () => createRatingBasic({ rating: 1609 }),
    });
    await markNowcoderAccountStatsRefreshFailed(
      db,
      { ...account, handle: "F0rL1ght" },
      new Error("network failed"),
      failedAt
    );

    const [stats] = await db.select().from(nowcoderAccountStats);

    expect(stats?.rating).toBe(1609);
    expect(stats?.acceptedProblemCount).toBe(312);
    expect(stats?.fetchedAt?.toISOString()).toBe(fetchedAt.toISOString());
    expect(stats?.lastAttemptedAt.toISOString()).toBe(failedAt.toISOString());
    expect(stats?.lastError).toBe("network failed");
  });

  it("rejects invalid UID values", async () => {
    const db = await createServiceTestDb();
    const account = await createNowcoderAccount(db, "not-a-uid");

    await expect(
      syncNowcoderAccountStats(db, account, new Date(), {
        loadAcceptedPracticeProblemCount: async () => 312,
        loadRatingBasic: async () => createRatingBasic(),
      })
    ).rejects.toThrow("Nowcoder UID is missing");
  });
});
