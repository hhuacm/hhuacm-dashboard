import { z } from "zod";

import {
  isCommonRetryableHttpStatus,
  requestExternalResource,
} from "../../request";

const nowcoderBaseUrl = "https://ac.nowcoder.com";
const requestMaxAttempts = 3;
const requestRetryDelayMs = 500;
const requestTimeoutMs = 10_000;

const nowcoderRatingBasicDataSchema = z.looseObject({
  allRatedCount: z.number(),
  colorLevel: z.number(),
  contestCount: z.number(),
  followedCount: z.number(),
  followingCount: z.number(),
  hasRank: z.boolean(),
  hasRating: z.boolean(),
  isFollowedByHost: z.boolean(),
  isHostSelf: z.boolean(),
  nickname: z.string(),
  rank: z.number(),
  ratedCount: z.number(),
  rating: z.number(),
  school: z.string(),
  teamRatedCount: z.number(),
  tinnyHeaderUrl: z.string(),
  uid: z.number(),
});

const nowcoderRatingBasicEnvelopeSchema = z.looseObject({
  code: z.number(),
  data: z.unknown(),
  msg: z.string(),
});

export type NowcoderRatingBasic = z.infer<typeof nowcoderRatingBasicDataSchema>;

const buildNowcoderRatingBasicUrl = (uid: number) => {
  const url = new URL("/acm/contest/rating-basic", nowcoderBaseUrl);
  url.searchParams.set("uid", String(uid));

  return url;
};

const ratingBasic = async (params: {
  uid: number;
}): Promise<NowcoderRatingBasic> => {
  const response = await requestExternalResource({
    label: `Nowcoder rating-basic ${params.uid}`,
    maxAttempts: requestMaxAttempts,
    request: async (signal) =>
      await fetch(buildNowcoderRatingBasicUrl(params.uid), { signal }),
    retryDelayMs: requestRetryDelayMs,
    retryableStatus: isCommonRetryableHttpStatus,
    timeoutMs: requestTimeoutMs,
  });

  if (!response.ok) {
    throw new Error(
      `Nowcoder rating-basic ${params.uid} HTTP ${response.status}`
    );
  }

  const payload: unknown = await response.json();
  const envelope = nowcoderRatingBasicEnvelopeSchema.safeParse(payload);

  if (!envelope.success) {
    throw new Error(
      `Nowcoder rating-basic ${params.uid} returned invalid JSON`
    );
  }

  if (envelope.data.code !== 0) {
    throw new Error(
      `Nowcoder rating-basic ${params.uid} returned ${envelope.data.code}: ${envelope.data.msg}`
    );
  }

  const rating = nowcoderRatingBasicDataSchema.safeParse(envelope.data.data);

  if (!rating.success) {
    throw new Error(`Nowcoder rating-basic ${params.uid} data is invalid`);
  }

  return rating.data;
};

export const nowcoderSource = {
  ratingBasic,
};
