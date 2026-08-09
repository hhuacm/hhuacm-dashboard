import { describe, expect, it } from "bun:test";
import { user } from "@hhuacm-dashboard/db/schema/auth";
import {
  luoguAcceptedProblem,
  luoguAccountStats,
} from "@hhuacm-dashboard/db/schema/luogu-account-stats";
import { userOjAccount } from "@hhuacm-dashboard/db/schema/oj-account";

import { createServiceTestDb } from "../test-db";
import { getLuoguStatsForProfile } from "./profile-stats";

describe("Luogu profile stats", () => {
  it("returns empty stats when the Luogu ID is invalid", async () => {
    const db = await createServiceTestDb();

    await expect(
      getLuoguStatsForProfile(db, {
        externalId: "invalid-luogu-id",
        handle: "invalid-luogu-id",
        id: "account-luogu",
      })
    ).resolves.toMatchObject({
      acceptedProblemCount: null,
      syncStatus: "empty",
    });
  });

  it("reads cached stats and accepted problem difficulty counts", async () => {
    const db = await createServiceTestDb();
    const fetchedAt = new Date();

    await db.insert(user).values({
      email: "luogu@example.com",
      id: "user-luogu",
      name: "luogu",
      username: "luogu",
    });
    await db.insert(userOjAccount).values({
      externalId: "97238",
      handle: "forlight",
      id: "account-luogu",
      platform: "luogu",
      userId: "user-luogu",
    });
    await db.insert(luoguAccountStats).values({
      acceptedProblemCount: 3,
      acceptedWeightedScore: 8,
      accountId: "account-luogu",
      averageAcceptedDifficulty: 4,
      fetchedAt,
      lastError: null,
    });
    await db.insert(luoguAcceptedProblem).values([
      {
        accountId: "account-luogu",
        difficulty: 1,
        name: "A+B Problem",
        pid: "P1001",
        type: "P",
      },
      {
        accountId: "account-luogu",
        difficulty: 7,
        name: "Hard Problem",
        pid: "P9999",
        type: "P",
      },
    ]);

    await expect(
      getLuoguStatsForProfile(db, {
        externalId: "97238",
        handle: "forlight",
        id: "account-luogu",
      })
    ).resolves.toMatchObject({
      acceptedProblemCount: 3,
      acceptedWeightedScore: 8,
      averageAcceptedDifficulty: 4,
      difficultyCounts: [
        { count: 0, difficulty: 0, label: "暂无评定" },
        { count: 1, difficulty: 1, label: "入门" },
        { count: 0, difficulty: 2, label: "普及-" },
        { count: 0, difficulty: 3, label: "普及/提高-" },
        { count: 0, difficulty: 4, label: "普及+/提高" },
        { count: 0, difficulty: 5, label: "提高+/省选-" },
        { count: 0, difficulty: 6, label: "省选/NOI-" },
        { count: 1, difficulty: 7, label: "NOI/NOI+/CTSC" },
      ],
      fetchedAt: fetchedAt.toISOString(),
      syncStatus: "ready",
    });
  });
});
