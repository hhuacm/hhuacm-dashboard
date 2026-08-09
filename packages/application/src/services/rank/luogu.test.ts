import { describe, expect, it } from "bun:test";
import { user } from "@hhuacm-dashboard/db/schema/auth";
import { luoguAccountStats } from "@hhuacm-dashboard/db/schema/luogu-account-stats";
import { userOjAccount } from "@hhuacm-dashboard/db/schema/oj-account";
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
      memberStatus: MemberStatus;
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
      platform: "luogu",
      userId: input.id,
    });

    if (input.acceptedWeightedScore !== undefined) {
      await db.insert(luoguAccountStats).values({
        acceptedProblemCount: input.acceptedProblemCount ?? null,
        acceptedWeightedScore: input.acceptedWeightedScore,
        accountId: `account-${input.id}`,
        averageAcceptedDifficulty: input.averageAcceptedDifficulty ?? null,
        fetchedAt: new Date(),
        lastError: null,
      });
    }
  };

  it("includes eligible members and sorts by Luogu rank metrics", async () => {
    const db = await createServiceTestDb();

    await createRankUser(db, {
      acceptedProblemCount: 1,
      acceptedWeightedScore: 50,
      averageAcceptedDifficulty: 1,
      id: "selection-user",
      memberStatus: "selection",
    });
    await createRankUser(db, {
      acceptedProblemCount: 10,
      acceptedWeightedScore: 40,
      averageAcceptedDifficulty: 1,
      id: "active-user",
      memberStatus: "active",
    });
    await createRankUser(db, {
      acceptedProblemCount: 9,
      acceptedWeightedScore: 40,
      averageAcceptedDifficulty: 4,
      id: "alpha-user",
      memberStatus: "active",
    });
    await createRankUser(db, {
      acceptedProblemCount: 9,
      acceptedWeightedScore: 40,
      averageAcceptedDifficulty: 4,
      id: "beta-user",
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
      acceptedProblemCount: 9,
      acceptedWeightedScore: 40,
      averageAcceptedDifficulty: 5,
      id: "higher-difficulty-user",
      memberStatus: "active",
    });

    const rows = await listLuoguRankRows(db);

    expect(
      rows.map((row) => [
        row.username,
        row.luogu.acceptedWeightedScore,
        row.luogu.acceptedProblemCount,
        row.luogu.averageAcceptedDifficulty,
      ])
    ).toEqual([
      ["selection-user", 50, 1, 1],
      ["active-user", 40, 10, 1],
      ["higher-difficulty-user", 40, 9, 5],
      ["alpha-user", 40, 9, 4],
      ["beta-user", 40, 9, 4],
    ]);
  });
});
