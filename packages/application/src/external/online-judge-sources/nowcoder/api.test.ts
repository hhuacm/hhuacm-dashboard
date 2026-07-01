import { describe, expect, it } from "bun:test";

import {
  mockFetchUrls,
  mockJsonResponse,
  mockTextResponse,
} from "../../test-fetch";
import { nowcoderSource } from "./api";

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

const createPracticeCodingHtml = (acceptedProblemCount: string | number) => `
  <section>
    <div class="my-state-main">
      <div class="my-state-item" style="width:310px;">
        <div class="state-num">329</div>
        <span>题已挑战</span>
      </div>
      <div class="my-state-item" style="width:310px;">
        <div class="state-num">${acceptedProblemCount}</div>
        <span>题已通过</span>
      </div>
      <div class="my-state-item" style="width:310px;">
        <div class="state-num">1201</div>
        <span>次提交</span>
      </div>
    </div>
    <table>
      <tbody>
        <tr><td>答案错误</td></tr>
        <tr><td>答案正确</td></tr>
      </tbody>
    </table>
  </section>
`;

describe("nowcoderSource", () => {
  it("loads rating-basic data", async () => {
    const data = createRatingBasicData();

    mockJsonResponse(createOkEnvelope(data));

    await expect(
      nowcoderSource.ratingBasic({ uid: 660_255_087 })
    ).resolves.toEqual(data);
  });

  it("builds the rating-basic URL with uid query", async () => {
    const urls = mockFetchUrls([
      Response.json(createOkEnvelope(createRatingBasicData())),
    ]);

    await nowcoderSource.ratingBasic({ uid: 660_255_087 });

    expect(urls).toEqual([
      "https://ac.nowcoder.com/acm/contest/rating-basic?uid=660255087",
    ]);
  });

  it("throws a Nowcoder-specific error for rating-basic HTTP failures", async () => {
    mockJsonResponse({}, 404);

    await expect(
      nowcoderSource.ratingBasic({ uid: 660_255_087 })
    ).rejects.toThrow("Nowcoder rating-basic 660255087 HTTP 404");
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

  it("loads accepted practice problem count from profile stats", async () => {
    mockTextResponse(createPracticeCodingHtml(312));

    await expect(
      nowcoderSource.acceptedPracticeProblemCount({ uid: 660_255_087 })
    ).resolves.toBe(312);
  });

  it("builds practice-coding URL with a small page size", async () => {
    const urls = mockFetchUrls([new Response(createPracticeCodingHtml(312))]);

    await nowcoderSource.acceptedPracticeProblemCount({ uid: 660_255_087 });

    expect(urls).toEqual([
      "https://ac.nowcoder.com/acm/contest/profile/660255087/practice-coding?pageSize=1",
    ]);
  });

  it("allows grouped accepted practice problem counts", async () => {
    mockTextResponse(createPracticeCodingHtml("1,234"));

    await expect(
      nowcoderSource.acceptedPracticeProblemCount({ uid: 660_255_087 })
    ).resolves.toBe(1234);
  });

  it("returns null when practice-coding stats are missing", async () => {
    mockTextResponse("<html><title>牛客竞赛</title></html>");

    await expect(
      nowcoderSource.acceptedPracticeProblemCount({ uid: 999_999_999 })
    ).resolves.toBeNull();
  });

  it("returns null when accepted practice problem count is invalid", async () => {
    mockTextResponse(createPracticeCodingHtml("暂无"));

    await expect(
      nowcoderSource.acceptedPracticeProblemCount({ uid: 660_255_087 })
    ).resolves.toBeNull();
  });
});
