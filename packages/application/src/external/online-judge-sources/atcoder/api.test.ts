import { describe, expect, it } from "bun:test";

import { mockFetchUrls, mockJsonResponse } from "../../test-fetch";
import { atcoderSource } from "./api";

const createHistoryItem = () => ({
  EndTime: "2025-11-29T22:40:00+09:00",
  IsRated: true,
  NewRating: 584,
  Performance: 711,
});

describe("atcoderSource", () => {
  it("loads user rating history from the encoded official URL", async () => {
    const item = createHistoryItem();
    const urls = mockFetchUrls([Response.json([item])]);

    await expect(
      atcoderSource.userHistory({ userId: "user/name" })
    ).resolves.toEqual([item]);
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
