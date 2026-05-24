import { describe, expect, it } from "bun:test";
import { user } from "@hhuacm-dashboard/db/schema/auth";
import { codeforcesAccountStats } from "@hhuacm-dashboard/db/schema/codeforces-account-stats";
import { userOjAccount } from "@hhuacm-dashboard/db/schema/oj-account";
import { userProfile } from "@hhuacm-dashboard/db/schema/profile";
import { refreshRequest } from "@hhuacm-dashboard/db/schema/refresh-request";
import type { MemberStatus } from "@hhuacm-dashboard/domain";

import { getCodeforcesStatsSyncStatus } from "../codeforces/sync-status";
import { createServiceTestDb } from "../test-db";
import { listCodeforcesRankRows } from "./codeforces";

describe("getCodeforcesStatsSyncStatus", () => {
  it("prioritizes active refresh requests", () => {
    expect(
      getCodeforcesStatsSyncStatus({
        fetchedAt: new Date(),
        hasActiveRefreshRequest: true,
        lastError: "failed",
      })
    ).toBe("refreshing");
  });

  it("marks missing stats as empty", () => {
    expect(
      getCodeforcesStatsSyncStatus({
        fetchedAt: null,
        hasActiveRefreshRequest: false,
        lastError: null,
      })
    ).toBe("empty");
  });

  it("marks failed stats before freshness", () => {
    expect(
      getCodeforcesStatsSyncStatus({
        fetchedAt: new Date(),
        hasActiveRefreshRequest: false,
        lastError: "Codeforces unavailable",
      })
    ).toBe("failed");
  });

  it("marks stats as ready when they have been fetched", () => {
    expect(
      getCodeforcesStatsSyncStatus({
        fetchedAt: new Date(),
        hasActiveRefreshRequest: false,
        lastError: null,
      })
    ).toBe("ready");
  });
});

describe("listCodeforcesRankRows", () => {
  const createRankUser = async (
    db: Awaited<ReturnType<typeof createServiceTestDb>>,
    input: {
      fetchedAt?: Date;
      id: string;
      memberStatus?: MemberStatus;
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
      handle: input.id,
      id: `account-${input.id}`,
      platform: "codeforces",
      profileUrl: `https://codeforces.com/profile/${input.id}`,
      userId: input.id,
    });

    if (input.fetchedAt) {
      await db.insert(codeforcesAccountStats).values({
        acceptedProblemCount: 1,
        acceptedProblemCountInMonth: 1,
        accountId: `account-${input.id}`,
        fetchedAt: input.fetchedAt,
        lastAttemptedAt: input.fetchedAt,
        lastError: null,
        lastOnlineAt: input.fetchedAt,
        maxRating: 1500,
        rating: 1400,
      });
    }
  };

  it("includes only current members", async () => {
    const db = await createServiceTestDb();

    await createRankUser(db, {
      id: "selection-user",
      memberStatus: "selection",
    });
    await createRankUser(db, { id: "active-user", memberStatus: "active" });
    await createRankUser(db, { id: "retired-user", memberStatus: "retired" });
    await createRankUser(db, { id: "frozen-user", memberStatus: "frozen" });
    await createRankUser(db, { id: "missing-profile-user" });

    const rows = await listCodeforcesRankRows(db);
    const usernames = rows.map((row) => row.username);

    expect(usernames).toContain("selection-user");
    expect(usernames).toContain("active-user");
    expect(usernames).toContain("missing-profile-user");
    expect(usernames).not.toContain("retired-user");
    expect(usernames).not.toContain("frozen-user");
    expect(rows[0]?.codeforces).toHaveProperty("syncStatus");
    expect(rows[0]?.codeforces).not.toHaveProperty("status");
  });

  it("enqueues missing and expired stats as refreshing", async () => {
    const db = await createServiceTestDb();
    const expiredFetchedAt = new Date("2026-01-01T00:00:00.000Z");

    await createRankUser(db, {
      fetchedAt: expiredFetchedAt,
      id: "expired-user",
      memberStatus: "active",
    });
    await createRankUser(db, {
      id: "missing-stats-user",
      memberStatus: "selection",
    });

    const rows = await listCodeforcesRankRows(db);
    const requests = await db.select().from(refreshRequest);

    expect(
      rows.map((row) => [row.username, row.codeforces.syncStatus])
    ).toEqual([
      ["expired-user", "refreshing"],
      ["missing-stats-user", "refreshing"],
    ]);
    expect(
      requests.map((request) => [request.kind, request.targetId]).sort()
    ).toEqual([
      ["codeforces.accountStats", "account-expired-user"],
      ["codeforces.accountStats", "account-missing-stats-user"],
    ]);
  });
});
