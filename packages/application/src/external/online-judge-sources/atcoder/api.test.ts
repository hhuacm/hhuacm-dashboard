import { describe, expect, it } from "bun:test";

import { mockFetchUrls, mockJsonResponse } from "../../test-fetch";
import { atcoderSource } from "./api";

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

describe("atcoderSource", () => {
  it("loads user rating history", async () => {
    const item = createHistoryItem();

    mockJsonResponse([item]);

    await expect(
      atcoderSource.userHistory({ userId: "forlight" })
    ).resolves.toEqual([item]);
  });

  it("builds the official history JSON URL with an encoded user id", async () => {
    const urls = mockFetchUrls([Response.json([])]);

    await atcoderSource.userHistory({ userId: "user/name" });

    expect(urls).toEqual(["https://atcoder.jp/users/user%2Fname/history/json"]);
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
