import { describe, expect, it } from "bun:test";
import { user } from "@hhuacm-dashboard/db/schema/auth";
import { userOjAccount } from "@hhuacm-dashboard/db/schema/oj-account";
import { userProfile } from "@hhuacm-dashboard/db/schema/profile";
import { refreshRequest } from "@hhuacm-dashboard/db/schema/refresh-request";
import {
  userAward,
  userAwardSync,
} from "@hhuacm-dashboard/db/schema/user-award";
import type { MemberStatus } from "@hhuacm-dashboard/domain";

import { createServiceTestDb } from "../../test-db";
import { userAwardsFromLuoguRefreshRequestDefinition } from "./user-awards-from-luogu";

describe("user awards from Luogu refresh request", () => {
  const createAccount = async (
    db: Awaited<ReturnType<typeof createServiceTestDb>>,
    input: {
      id: string;
      memberStatus?: MemberStatus;
      profileUrl?: string;
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
      platform: "luogu",
      profileUrl: input.profileUrl ?? "https://www.luogu.com.cn/user/97238",
      userId: input.id,
    });
  };

  it("only enqueues stale Luogu award refreshes for current members", async () => {
    const db = await createServiceTestDb();
    const staleFetchedAt = new Date("2026-01-01T00:00:00.000Z");
    const freshFetchedAt = new Date();

    await createAccount(db, {
      id: "selection-user",
      memberStatus: "selection",
    });
    await createAccount(db, { id: "active-user", memberStatus: "active" });
    await createAccount(db, { id: "fresh-user", memberStatus: "active" });
    await createAccount(db, { id: "retired-user", memberStatus: "retired" });
    await createAccount(db, { id: "frozen-user", memberStatus: "frozen" });
    await createAccount(db, { id: "missing-profile-user" });
    await db.insert(userAwardSync).values([
      {
        fetchedAt: freshFetchedAt,
        lastAttemptedAt: freshFetchedAt,
        source: "luogu",
        userId: "fresh-user",
      },
      {
        fetchedAt: staleFetchedAt,
        lastAttemptedAt: staleFetchedAt,
        source: "luogu",
        userId: "selection-user",
      },
    ]);

    const enqueuedCount =
      await userAwardsFromLuoguRefreshRequestDefinition.scanStaleTargets(
        db,
        new Date()
      );
    const requests = await db.select().from(refreshRequest);
    const targetIds = requests.map((request) => request.targetId);

    expect(enqueuedCount).toBe(3);
    expect(targetIds).toContain("account-selection-user");
    expect(targetIds).toContain("account-active-user");
    expect(targetIds).toContain("account-missing-profile-user");
    expect(targetIds).not.toContain("account-fresh-user");
    expect(targetIds).not.toContain("account-retired-user");
    expect(targetIds).not.toContain("account-frozen-user");
  });

  it("handles queued retired users and preserves cached awards on failure", async () => {
    const db = await createServiceTestDb();
    await createAccount(db, {
      id: "retired-user",
      memberStatus: "retired",
      profileUrl: "",
    });
    await db.insert(userAward).values({
      contest: "Cached Contest",
      event: null,
      level: "铜牌",
      sortOrder: 0,
      source: "luogu",
      userId: "retired-user",
      year: 2020,
    });

    await userAwardsFromLuoguRefreshRequestDefinition.handle(db, {
      createdAt: new Date(),
      kind: "user.awardsFromLuogu",
      targetId: "account-retired-user",
    });

    const awards = await db.select().from(userAward);
    const [sync] = await db.select().from(userAwardSync);

    expect(awards).toHaveLength(1);
    expect(awards[0]?.contest).toBe("Cached Contest");
    expect(sync?.lastError).toBe("Luogu UID is missing");
  });

  it("records missing UID failures without deleting cached awards", async () => {
    const db = await createServiceTestDb();
    await createAccount(db, {
      id: "active-user",
      memberStatus: "active",
      profileUrl: "",
    });
    await db.insert(userAward).values({
      contest: "Cached Contest",
      event: null,
      level: "铜牌",
      sortOrder: 0,
      source: "luogu",
      userId: "active-user",
      year: 2020,
    });

    await userAwardsFromLuoguRefreshRequestDefinition.handle(db, {
      createdAt: new Date(),
      kind: "user.awardsFromLuogu",
      targetId: "account-active-user",
    });

    const awards = await db.select().from(userAward);
    const [sync] = await db.select().from(userAwardSync);

    expect(awards).toHaveLength(1);
    expect(sync?.lastError).toBe("Luogu UID is missing");
  });
});
