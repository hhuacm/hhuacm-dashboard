import { afterEach, describe, expect, it } from "bun:test";

import {
  getLuoguStatsForProfile,
  parseLuoguUidFromProfileUrl,
  summarizeLuoguPractice,
} from "./profile-stats";

const originalFetch = globalThis.fetch;

const mockLuoguPracticeHttpFailure = () => {
  let requestCount = 0;

  globalThis.fetch = Object.assign(
    (_url: string | URL | Request, _init?: RequestInit) => {
      requestCount += 1;

      if (requestCount === 1) {
        return Promise.resolve(
          new Response(null, {
            headers: {
              location: "https://www.luogu.com.cn/user/97238/practice",
              "set-cookie": "C3VK=test; Max-Age=300; Path=/",
            },
            status: 302,
          })
        );
      }

      return Promise.resolve(new Response("server error", { status: 500 }));
    },
    {
      preconnect: originalFetch.preconnect,
    }
  );
};

afterEach(() => {
  globalThis.fetch = originalFetch;
});

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
    await expect(
      getLuoguStatsForProfile({ profileUrl: "" })
    ).resolves.toMatchObject({
      acceptedProblemCount: null,
      lastError: "Luogu UID is missing",
      syncStatus: "empty",
    });
  });

  it("returns failed stats when Luogu practice request fails", async () => {
    mockLuoguPracticeHttpFailure();

    await expect(
      getLuoguStatsForProfile({
        profileUrl: "https://www.luogu.com.cn/user/97238",
      })
    ).resolves.toMatchObject({
      acceptedProblemCount: null,
      lastError: "Luogu page data HTTP 500",
      syncStatus: "failed",
    });
  });
});
