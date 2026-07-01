import { describe, expect, it } from "bun:test";
import { user } from "@hhuacm-dashboard/db/schema/auth";
import {
  luoguAcceptedProblem,
  luoguAccountStats,
} from "@hhuacm-dashboard/db/schema/luogu-account-stats";
import { userOjAccount } from "@hhuacm-dashboard/db/schema/oj-account";
import { refreshRequest } from "@hhuacm-dashboard/db/schema/refresh-request";

import { createServiceTestDb } from "../test-db";
import {
  getLuoguStatsForProfile,
  summarizeLuoguDifficultyCounts,
} from "./profile-stats";

describe("Luogu profile stats", () => {
  it("summarizes all accepted Luogu practice problems by difficulty", () => {
    expect(
      summarizeLuoguDifficultyCounts([
        { difficulty: 0 },
        { difficulty: 1 },
        { difficulty: 1 },
        { difficulty: 6 },
        { difficulty: null },
      ])
    ).toEqual([
      { count: 1, difficulty: 0, label: "暂无评定" },
      { count: 2, difficulty: 1, label: "入门" },
      { count: 0, difficulty: 2, label: "普及-" },
      { count: 0, difficulty: 3, label: "普及/提高-" },
      { count: 0, difficulty: 4, label: "普及+/提高" },
      { count: 0, difficulty: 5, label: "提高+/省选-" },
      { count: 1, difficulty: 6, label: "省选/NOI-" },
      { count: 0, difficulty: 7, label: "NOI/NOI+/CTSC" },
    ]);
  });

  it("returns empty stats when UID is missing", async () => {
    const db = await createServiceTestDb();

    await expect(
      getLuoguStatsForProfile(db, {
        externalId: "",
        handle: "",
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
      lastAttemptedAt: fetchedAt,
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
      fetchedAt: fetchedAt.toISOString(),
      syncStatus: "ready",
    });
  });

  it("enqueues refresh requests for missing local stats", async () => {
    const db = await createServiceTestDb();

    const stats = await getLuoguStatsForProfile(db, {
      externalId: "97238",
      handle: "forlight",
      id: "account-luogu",
    });
    const requests = await db.select().from(refreshRequest);

    expect(stats?.syncStatus).toBe("refreshing");
    expect(requests).toHaveLength(1);
    expect(requests[0]?.targetId).toBe("account-luogu");
  });
});
