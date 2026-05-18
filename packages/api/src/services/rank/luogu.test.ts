import { describe, expect, it } from "bun:test";
import { user } from "@hhuacm-dashboard/db/schema/auth";
import { luoguAccountStats } from "@hhuacm-dashboard/db/schema/luogu-account-stats";
import { userOjAccount } from "@hhuacm-dashboard/db/schema/oj-account";
import { userProfile } from "@hhuacm-dashboard/db/schema/profile";
import type { MemberStatus } from "@hhuacm-dashboard/domain";

import { createServiceTestDb } from "../test-db";
import { listLuoguRankRows } from "./luogu";

describe("listLuoguRankRows", () => {
  const createRankUser = async (
    db: Awaited<ReturnType<typeof createServiceTestDb>>,
    input: {
      acceptedProblemCount?: null | number;
      acceptedWeightedScore?: null | number;
      averageAcceptedDifficulty?: null | number;
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
      normalizedHandle: input.id,
      platform: "luogu",
      profileUrl: "https://www.luogu.com.cn/user/97238",
      userId: input.id,
    });

    if (input.acceptedWeightedScore !== undefined) {
      const fetchedAt = new Date("2026-01-01T00:00:00.000Z");

      await db.insert(luoguAccountStats).values({
        acceptedProblemCount: input.acceptedProblemCount ?? null,
        acceptedWeightedScore: input.acceptedWeightedScore,
        accountId: `account-${input.id}`,
        averageAcceptedDifficulty: input.averageAcceptedDifficulty ?? null,
        fetchedAt,
        lastAttemptedAt: fetchedAt,
        lastError: null,
        uid: 97_238,
      });
    }
  };

  it("includes eligible members and sorts by Luogu rank metrics", async () => {
    const db = await createServiceTestDb();

    await createRankUser(db, {
      acceptedProblemCount: 10,
      acceptedWeightedScore: 20,
      averageAcceptedDifficulty: 2,
      id: "selection-user",
      memberStatus: "selection",
    });
    await createRankUser(db, {
      acceptedProblemCount: 8,
      acceptedWeightedScore: 30,
      averageAcceptedDifficulty: 3,
      id: "active-user",
      memberStatus: "active",
    });
    await createRankUser(db, {
      acceptedProblemCount: 100,
      acceptedWeightedScore: 100,
      averageAcceptedDifficulty: 5,
      id: "retired-user",
      memberStatus: "retired",
    });
    await createRankUser(db, {
      acceptedProblemCount: 100,
      acceptedWeightedScore: 100,
      averageAcceptedDifficulty: 5,
      id: "frozen-user",
      memberStatus: "frozen",
    });
    await createRankUser(db, {
      acceptedProblemCount: 1,
      acceptedWeightedScore: 1,
      averageAcceptedDifficulty: 1,
      id: "missing-profile-user",
    });

    const rows = await listLuoguRankRows(db);
    const usernames = rows.map((row) => row.username);

    expect(usernames).toEqual([
      "active-user",
      "selection-user",
      "missing-profile-user",
    ]);
    expect(usernames).not.toContain("retired-user");
    expect(usernames).not.toContain("frozen-user");
  });
});
