import { afterEach, describe, expect, it } from "bun:test";

import { nowcoderSource } from "./api";

const originalFetch = globalThis.fetch;

const createRatingBasicData = () => ({
  allRatedCount: 32,
  colorLevel: 4,
  contestCount: 72,
  followedCount: 8,
  followingCount: 7,
  hasRank: false,
  hasRating: true,
  isFollowedByHost: false,
  isHostSelf: false,
  nickname: "F0rL1ght",
  rank: -1,
  ratedCount: 17,
  rating: 1609,
  school: "河海大学",
  teamRatedCount: 15,
  tinnyHeaderUrl:
    "https://images.nowcoder.com/images/20200805/660255087_1596626167187_DE6BA02482C88CFFE9FCBC469CA57CD6?x-oss-process=image/resize,m_mfit,h_100,w_100",
  uid: 660_255_087,
});

const createOkEnvelope = (data: unknown = createRatingBasicData()) => ({
  code: 0,
  data,
  msg: "OK",
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

describe("nowcoderSource", () => {
  it("loads rating-basic data", async () => {
    const data = createRatingBasicData();

    mockJsonResponse(createOkEnvelope(data));

    await expect(
      nowcoderSource.ratingBasic({ uid: 660_255_087 })
    ).resolves.toEqual(data);
  });

  it("builds the rating-basic URL with uid query", async () => {
    const urls = mockFetchResponses([
      Response.json(createOkEnvelope(createRatingBasicData())),
    ]);

    await nowcoderSource.ratingBasic({ uid: 660_255_087 });

    expect(urls).toEqual([
      "https://ac.nowcoder.com/acm/contest/rating-basic?uid=660255087",
    ]);
  });

  it("keeps extra rating-basic data fields", async () => {
    mockJsonResponse(
      createOkEnvelope({
        ...createRatingBasicData(),
        CustomRatingField: "kept",
      })
    );

    await expect(
      nowcoderSource.ratingBasic({ uid: 660_255_087 })
    ).resolves.toEqual({
      ...createRatingBasicData(),
      CustomRatingField: "kept",
    });
  });

  it("retries transient request failures", async () => {
    const urls = mockFetchResponses([
      new Error("network failed"),
      Response.json(createOkEnvelope()),
    ]);

    await expect(
      nowcoderSource.ratingBasic({ uid: 660_255_087 })
    ).resolves.toMatchObject({ nickname: "F0rL1ght" });
    expect(urls).toHaveLength(2);
  });

  it("retries retryable HTTP status responses", async () => {
    const urls = mockFetchResponses([
      Response.json({}, { status: 502 }),
      Response.json(createOkEnvelope()),
    ]);

    await expect(
      nowcoderSource.ratingBasic({ uid: 660_255_087 })
    ).resolves.toMatchObject({ uid: 660_255_087 });
    expect(urls).toHaveLength(2);
  });

  it("does not retry non-retryable HTTP status responses", async () => {
    const urls = mockFetchResponses([Response.json({}, { status: 404 })]);

    await expect(
      nowcoderSource.ratingBasic({ uid: 660_255_087 })
    ).rejects.toThrow("Nowcoder rating-basic 660255087 HTTP 404");
    expect(urls).toHaveLength(1);
  });

  it("throws when Nowcoder envelope code is not OK", async () => {
    mockJsonResponse({
      code: 10_001,
      data: null,
      msg: "uid is invalid",
    });

    await expect(
      nowcoderSource.ratingBasic({ uid: 660_255_087 })
    ).rejects.toThrow(
      "Nowcoder rating-basic 660255087 returned 10001: uid is invalid"
    );
  });

  it("throws when rating-basic data has an invalid raw shape", async () => {
    mockJsonResponse(
      createOkEnvelope({
        ...createRatingBasicData(),
        uid: "660255087",
      })
    );

    await expect(
      nowcoderSource.ratingBasic({ uid: 660_255_087 })
    ).rejects.toThrow("Nowcoder rating-basic 660255087 data is invalid");
  });

  it("throws when rating-basic only returns follow metadata", async () => {
    mockJsonResponse(
      createOkEnvelope({
        followedCount: 0,
        followingCount: 0,
        isFollowedByHost: false,
        isHostSelf: false,
      })
    );

    await expect(nowcoderSource.ratingBasic({ uid: 1 })).rejects.toThrow(
      "Nowcoder rating-basic 1 data is invalid"
    );
  });
});
