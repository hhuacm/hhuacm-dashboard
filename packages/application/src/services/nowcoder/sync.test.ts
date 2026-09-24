import { describe, expect, it } from "bun:test";
import { user } from "@hhuacm-dashboard/db/schema/auth";
import { nowcoderAccountStats } from "@hhuacm-dashboard/db/schema/nowcoder-account-stats";
import { userOjAccount } from "@hhuacm-dashboard/db/schema/oj-account";

import type { NowcoderRatingBasic } from "../../external/online-judge-sources/nowcoder/api";
import { deleteOjAccount, updateOjAccount } from "../oj-account/commands";
import { createServiceTestDb } from "../test-db";
import {
  markNowcoderAccountStatsRefreshFailed,
  syncNowcoderAccountStats,
} from "./sync";

const createRatingBasic = (
  input: Partial<NowcoderRatingBasic> = {}
): NowcoderRatingBasic => ({
  nickname: input.nickname ?? "F0rL1ght",
  rating: input.rating ?? 1609,
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
  for (const change of [updateOjAccount, deleteOjAccount]) {
    it(`discards outdated stats, nickname, and failure after ${change.name}`, async () => {
      const db = await createServiceTestDb();
      const account = await createNowcoderAccount(db);

      await syncNowcoderAccountStats(db, account, new Date(), {
        loadAcceptedPracticeProblemCount: async () => 312,
        loadRatingBasic: async () => {
          await change(db, {
            externalId: "12345",
            platform: "nowcoder",
            userId: "user-660255087",
          });
          return createRatingBasic();
        },
      });
      await markNowcoderAccountStatsRefreshFailed(
        db,
        account,
        new Error("old request failed")
      );

      expect(await db.select().from(nowcoderAccountStats)).toEqual([]);
      const [currentAccount] = await db.select().from(userOjAccount);
      expect(currentAccount?.handle).toBe(
        change === updateOjAccount ? "12345" : undefined
      );
    });
  }

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

  it("records failures without overwriting fetched stats", async () => {
    const db = await createServiceTestDb();
    const account = await createNowcoderAccount(db);
    const fetchedAt = new Date("2026-01-01T00:00:00.000Z");

    await syncNowcoderAccountStats(db, account, fetchedAt, {
      loadAcceptedPracticeProblemCount: async () => 312,
      loadRatingBasic: async () => createRatingBasic({ rating: 1609 }),
    });
    await markNowcoderAccountStatsRefreshFailed(
      db,
      { ...account, handle: "F0rL1ght" },
      new Error("network failed")
    );

    const [stats] = await db.select().from(nowcoderAccountStats);

    expect(stats?.rating).toBe(1609);
    expect(stats?.acceptedProblemCount).toBe(312);
    expect(stats?.fetchedAt?.toISOString()).toBe(fetchedAt.toISOString());
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
