import { describe, expect, it } from "bun:test";
import { atcoderAccountStats } from "@hhuacm-dashboard/db/schema/atcoder-account-stats";
import { user } from "@hhuacm-dashboard/db/schema/auth";
import { userOjAccount } from "@hhuacm-dashboard/db/schema/oj-account";
import type { MemberStatus } from "@hhuacm-dashboard/domain";

import { createServiceTestDb } from "../test-db";
import { listAtcoderRankRows } from "./atcoder";

describe("listAtcoderRankRows", () => {
  const createRankUser = async (
    db: Awaited<ReturnType<typeof createServiceTestDb>>,
    input: {
      id: string;
      memberStatus: MemberStatus;
      rating?: null | number;
      recentPerformanceAverage?: null | number;
    }
  ) => {
    await db.insert(user).values({
      email: `${input.id}@example.com`,
      id: input.id,
      memberStatus: input.memberStatus,
      name: input.id,
      username: input.id,
    });

    await db.insert(userOjAccount).values({
      externalId: input.id,
      handle: input.id,
      id: `account-${input.id}`,
      platform: "atcoder",
      userId: input.id,
    });

    if (input.rating !== undefined) {
      await db.insert(atcoderAccountStats).values({
        accountId: `account-${input.id}`,
        fetchedAt: new Date(),
        lastError: null,
        rating: input.rating,
        recentPerformanceAverage: input.recentPerformanceAverage ?? null,
      });
    }
  };

  it("includes current members and sorts by AtCoder rating metrics", async () => {
    const db = await createServiceTestDb();

    await createRankUser(db, {
      id: "selection-user",
      memberStatus: "selection",
      rating: 1400,
      recentPerformanceAverage: 1700,
    });
    await createRankUser(db, {
      id: "active-user",
      memberStatus: "active",
      rating: 1800,
      recentPerformanceAverage: 1600,
    });
    await createRankUser(db, {
      id: "tie-user",
      memberStatus: "active",
      rating: 1800,
      recentPerformanceAverage: 1750,
    });
    await createRankUser(db, {
      id: "retired-user",
      memberStatus: "retired",
      rating: 3000,
      recentPerformanceAverage: 3000,
    });
    await createRankUser(db, {
      id: "frozen-user",
      memberStatus: "frozen",
      rating: 3000,
      recentPerformanceAverage: 3000,
    });
    const rows = await listAtcoderRankRows(db);

    expect(rows.map((row) => row.username)).toEqual([
      "tie-user",
      "active-user",
      "selection-user",
    ]);
  });
});
