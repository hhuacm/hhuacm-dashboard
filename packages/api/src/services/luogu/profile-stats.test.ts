import { describe, expect, it } from "bun:test";
import {
  luoguAcceptedProblem,
  luoguAccountStats,
} from "@hhuacm-dashboard/db/schema/luogu-account-stats";
import { refreshRequest } from "@hhuacm-dashboard/db/schema/refresh-request";

import { createServiceTestDb } from "../test-db";
import {
  getLuoguStatsForProfile,
  parseLuoguUidFromProfileUrl,
  summarizeLuoguPractice,
} from "./profile-stats";

describe("Luogu profile stats", () => {
  it("parses UID from Luogu profile URL", () => {
    expect(
      parseLuoguUidFromProfileUrl("https://www.luogu.com.cn/user/97238")
    ).toBe(97_238);
    expect(
      parseLuoguUidFromProfileUrl("https://www.luogu.com.cn/user/97238/")
    ).toBe(97_238);
    expect(parseLuoguUidFromProfileUrl("")).toBeNull();
    expect(
      parseLuoguUidFromProfileUrl("https://www.luogu.com.cn/problem/P1001")
    ).toBeNull();
  });

  it("summarizes all accepted Luogu practice problems by difficulty", () => {
    const summary = summarizeLuoguPractice({
      passed: [
        { difficulty: 0 },
        { difficulty: 1 },
        { difficulty: 1 },
        { difficulty: 6 },
        { difficulty: null },
      ],
      passedProblemCount: 9,
    });

    expect(summary.acceptedProblemCount).toBe(9);
    expect(summary.acceptedWeightedScore).toBe(8);
    expect(summary.averageAcceptedDifficulty).toBe(2);
    expect(summary.difficultyCounts).toEqual([
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

  it("falls back to passed array length when total count is absent", () => {
    expect(
      summarizeLuoguPractice({
        passed: [{ difficulty: 1 }, { difficulty: 2 }],
        passedProblemCount: null,
      }).acceptedProblemCount
    ).toBe(2);
  });

  it("returns empty stats when UID is missing", async () => {
    const db = await createServiceTestDb();

    await expect(
      getLuoguStatsForProfile(db, {
        handle: "",
        id: "account-luogu",
        profileUrl: "",
      })
    ).resolves.toMatchObject({
      acceptedProblemCount: null,
      syncStatus: "empty",
    });
  });

  it("reads cached stats and accepted problem difficulty counts", async () => {
    const db = await createServiceTestDb();
    const fetchedAt = new Date();

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
        handle: "forlight",
        id: "account-luogu",
        profileUrl: "https://www.luogu.com.cn/user/97238",
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
      handle: "forlight",
      id: "account-luogu",
      profileUrl: "https://www.luogu.com.cn/user/97238",
    });
    const requests = await db.select().from(refreshRequest);

    expect(stats?.syncStatus).toBe("refreshing");
    expect(requests).toHaveLength(1);
    expect(requests[0]?.targetId).toBe("account-luogu");
  });
});
