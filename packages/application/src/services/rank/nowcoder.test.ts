import { describe, expect, it } from "bun:test";
import { user } from "@hhuacm-dashboard/db/schema/auth";
import { nowcoderAccountStats } from "@hhuacm-dashboard/db/schema/nowcoder-account-stats";
import { userOjAccount } from "@hhuacm-dashboard/db/schema/oj-account";
import { userProfile } from "@hhuacm-dashboard/db/schema/profile";
import { refreshRequest } from "@hhuacm-dashboard/db/schema/refresh-request";
import type { MemberStatus } from "@hhuacm-dashboard/domain";

import { createServiceTestDb } from "../test-db";
import { listNowcoderRankRows } from "./nowcoder";

describe("listNowcoderRankRows", () => {
  const createRankUser = async (
    db: Awaited<ReturnType<typeof createServiceTestDb>>,
    input: {
      acceptedProblemCount?: null | number;
      fetchedAt?: Date;
      id: string;
      memberStatus?: MemberStatus;
      rating?: null | number;
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
      platform: "nowcoder",
      userId: input.id,
    });

    if (input.acceptedProblemCount !== undefined) {
      const fetchedAt = input.fetchedAt ?? new Date();

      await db.insert(nowcoderAccountStats).values({
        acceptedProblemCount: input.acceptedProblemCount,
        accountId: `account-${input.id}`,
        fetchedAt,
        lastAttemptedAt: fetchedAt,
        lastError: null,
        rating: input.rating ?? null,
      });
    }
  };

  it("includes current members and sorts by Nowcoder accepted count", async () => {
    const db = await createServiceTestDb();

    await createRankUser(db, {
      acceptedProblemCount: 90,
      id: "selection-user",
      memberStatus: "selection",
      rating: 1700,
    });
    await createRankUser(db, {
      acceptedProblemCount: 120,
      id: "active-user",
      memberStatus: "active",
      rating: 1600,
    });
    await createRankUser(db, {
      acceptedProblemCount: 120,
      id: "tie-user",
      memberStatus: "active",
      rating: 1800,
    });
    await createRankUser(db, {
      acceptedProblemCount: 300,
      id: "retired-user",
      memberStatus: "retired",
      rating: 3000,
    });
    await createRankUser(db, {
      acceptedProblemCount: 300,
      id: "frozen-user",
      memberStatus: "frozen",
      rating: 3000,
    });
    await createRankUser(db, {
      acceptedProblemCount: 30,
      id: "missing-profile-user",
      rating: 1200,
    });

    const rows = await listNowcoderRankRows(db);

    expect(rows.map((row) => row.username)).toEqual([
      "tie-user",
      "active-user",
      "selection-user",
      "missing-profile-user",
    ]);
    expect(rows.map((row) => row.nowcoder.syncStatus)).toEqual([
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
      acceptedProblemCount: 120,
      fetchedAt: expiredFetchedAt,
      id: "expired-user",
      memberStatus: "active",
      rating: 1800,
    });
    await createRankUser(db, {
      id: "missing-stats-user",
      memberStatus: "selection",
    });

    const rows = await listNowcoderRankRows(db);
    const requests = await db.select().from(refreshRequest);

    expect(rows.map((row) => [row.username, row.nowcoder.syncStatus])).toEqual([
      ["expired-user", "refreshing"],
      ["missing-stats-user", "refreshing"],
    ]);
    expect(
      requests.map((request) => [request.kind, request.targetId]).sort()
    ).toEqual([
      ["nowcoder.accountStats", "account-expired-user"],
      ["nowcoder.accountStats", "account-missing-stats-user"],
    ]);
  });
});
