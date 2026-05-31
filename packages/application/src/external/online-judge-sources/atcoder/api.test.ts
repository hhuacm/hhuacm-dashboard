import { afterEach, describe, expect, it } from "bun:test";

import { atcoderSource } from "./api";

const originalFetch = globalThis.fetch;

const createHistoryItem = () => ({
  ContestName:
    "Ｓｋｙ株式会社プログラミングコンテスト2025（AtCoder Beginner Contest 434）",
  ContestNameEn:
    "Ｓｋｙ Inc, Programming Contest 2025 (AtCoder Beginner Contest 434)",
  ContestScreenName: "abc434.contest.atcoder.jp",
  EndTime: "2025-11-29T22:40:00+09:00",
  InnerPerformance: 711,
  IsRated: true,
  NewRating: 584,
  OldRating: 566,
  Performance: 711,
  Place: 3891,
});

const mockJsonResponse = (payload: unknown, status = 200) => {
  globalThis.fetch = Object.assign(
    async () => Response.json(payload, { status }),
    { preconnect: originalFetch.preconnect }
  );
};

const mockFetchResponses = (responses: Array<Error | Response>) => {
  const urls: string[] = [];

  globalThis.fetch = Object.assign(
    (url: string | URL | Request) => {
      urls.push(url.toString());
      const response = responses.shift();

      if (response === undefined) {
        return Promise.reject(new Error("Unexpected fetch call"));
      }

      if (response instanceof Error) {
        return Promise.reject(response);
      }

      return Promise.resolve(response);
    },
    { preconnect: originalFetch.preconnect }
  );

  return urls;
};

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("atcoderSource", () => {
  it("loads user rating history", async () => {
    const item = createHistoryItem();

    mockJsonResponse([item]);

    await expect(
      atcoderSource.userHistory({ userId: "forlight" })
    ).resolves.toEqual([item]);
  });

  it("builds the official history JSON URL with an encoded user id", async () => {
    const urls = mockFetchResponses([Response.json([])]);

    await atcoderSource.userHistory({ userId: "user/name" });

    expect(urls).toEqual(["https://atcoder.jp/users/user%2Fname/history/json"]);
  });

  it("keeps extra history item fields", async () => {
    mockJsonResponse([
      {
        ...createHistoryItem(),
        CustomHistoryField: "kept",
      },
    ]);

    await expect(
      atcoderSource.userHistory({ userId: "forlight" })
    ).resolves.toEqual([
      {
        ...createHistoryItem(),
        CustomHistoryField: "kept",
      },
    ]);
  });

  it("throws when history response has an invalid raw shape", async () => {
    mockJsonResponse([
      {
        ...createHistoryItem(),
        NewRating: "584",
      },
    ]);

    await expect(
      atcoderSource.userHistory({ userId: "forlight" })
    ).rejects.toThrow("AtCoder user history forlight returned invalid JSON");
  });
});
