import { describe, expect, it } from "bun:test";
import { atcoderAccountStats } from "@hhuacm-dashboard/db/schema/atcoder-account-stats";
import { user } from "@hhuacm-dashboard/db/schema/auth";
import { userOjAccount } from "@hhuacm-dashboard/db/schema/oj-account";
import { userProfile } from "@hhuacm-dashboard/db/schema/profile";
import { refreshRequest } from "@hhuacm-dashboard/db/schema/refresh-request";
import type { MemberStatus } from "@hhuacm-dashboard/domain";

import { createServiceTestDb } from "../test-db";
import { listAtcoderRankRows } from "./atcoder";

describe("listAtcoderRankRows", () => {
  const createRankUser = async (
    db: Awaited<ReturnType<typeof createServiceTestDb>>,
    input: {
      fetchedAt?: Date;
      id: string;
      memberStatus?: MemberStatus;
      rating?: null | number;
      recentPerformanceAverage?: null | number;
    }
  ) => {
    await db.insert(user).values({
      email: `${input.id}@example.com`,
      id: input.id,
      name: input.id,
      username: input.id,
    });

    if (input.memberStatus) {
      await db.insert(userProfile).values({
        memberStatus: input.memberStatus,
        userId: input.id,
      });
    }

    await db.insert(userOjAccount).values({
      externalId: input.id,
      handle: input.id,
      id: `account-${input.id}`,
      platform: "atcoder",
      userId: input.id,
    });

    if (input.rating !== undefined) {
      const fetchedAt = input.fetchedAt ?? new Date();

      await db.insert(atcoderAccountStats).values({
        accountId: `account-${input.id}`,
        fetchedAt,
        lastAttemptedAt: fetchedAt,
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
    await createRankUser(db, {
      id: "missing-profile-user",
      rating: 1200,
      recentPerformanceAverage: 1200,
    });

    const rows = await listAtcoderRankRows(db);

    expect(rows.map((row) => row.username)).toEqual([
      "tie-user",
      "active-user",
      "selection-user",
      "missing-profile-user",
    ]);
    expect(rows.map((row) => row.atcoder.syncStatus)).toEqual([
      "ready",
      "ready",
      "ready",
      "ready",
    ]);
  });

  it("enqueues missing and expired stats as refreshing", async () => {
    const db = await createServiceTestDb();
    const expiredFetchedAt = new Date("2026-01-01T00:00:00.000Z");

    await createRankUser(db, {
      fetchedAt: expiredFetchedAt,
      id: "expired-user",
      memberStatus: "active",
      rating: 1800,
      recentPerformanceAverage: 1700,
    });
    await createRankUser(db, {
      id: "missing-stats-user",
      memberStatus: "selection",
    });

    const rows = await listAtcoderRankRows(db);
    const requests = await db.select().from(refreshRequest);

    expect(rows.map((row) => [row.username, row.atcoder.syncStatus])).toEqual([
      ["expired-user", "refreshing"],
      ["missing-stats-user", "refreshing"],
    ]);
    expect(
      requests.map((request) => [request.kind, request.targetId]).sort()
    ).toEqual([
      ["atcoder.accountStats", "account-expired-user"],
      ["atcoder.accountStats", "account-missing-stats-user"],
    ]);
  });
});
