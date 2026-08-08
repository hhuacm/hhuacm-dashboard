import { z } from "zod";

import { requestExternalResource } from "../../request";

const nowcoderBaseUrl = "https://ac.nowcoder.com";

const nowcoderRatingBasicDataSchema = z.looseObject({
  nickname: z.string(),
  rating: z.number(),
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

const buildNowcoderPracticeCodingUrl = (uid: number) => {
  const url = new URL(
    `/acm/contest/profile/${encodeURIComponent(uid)}/practice-coding`,
    nowcoderBaseUrl
  );
  url.searchParams.set("pageSize", "1");

  return url;
};

const parseCountText = (value: string) => {
  const normalizedValue = value.replaceAll(",", "");
  const count = Number(normalizedValue);

  return Number.isSafeInteger(count) && count >= 0 ? count : null;
};

const parseAcceptedPracticeProblemCount = (html: string) => {
  const statsItemPattern =
    /<div\b[^>]*class="[^"]*\bmy-state-item\b[^"]*"[^>]*>\s*<div\b[^>]*class="[^"]*\bstate-num\b[^"]*"[^>]*>\s*([0-9,]+)\s*<\/div>\s*<span>\s*([^<]+?)\s*<\/span>/g;

  for (const match of html.matchAll(statsItemPattern)) {
    const [, countText, labelText] = match;

    if (labelText?.trim() !== "题已通过") {
      continue;
    }

    return countText === undefined ? null : parseCountText(countText);
  }

  return null;
};

const ratingBasic = async (params: {
  uid: number;
}): Promise<NowcoderRatingBasic> => {
  const response = await requestExternalResource({
    label: `Nowcoder rating-basic ${params.uid}`,
    request: async (signal) =>
      await fetch(buildNowcoderRatingBasicUrl(params.uid), { signal }),
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

const acceptedPracticeProblemCount = async (params: {
  uid: number;
}): Promise<number> => {
  const response = await requestExternalResource({
    label: `Nowcoder practice-coding ${params.uid}`,
    request: async (signal) =>
      await fetch(buildNowcoderPracticeCodingUrl(params.uid), { signal }),
  });

  if (!response.ok) {
    throw new Error(
      `Nowcoder practice-coding ${params.uid} HTTP ${response.status}`
    );
  }

  const count = parseAcceptedPracticeProblemCount(await response.text());

  if (count === null) {
    throw new Error(
      `Nowcoder practice-coding ${params.uid} has no valid accepted problem count`
    );
  }

  return count;
};

export const nowcoderSource = {
  acceptedPracticeProblemCount,
  ratingBasic,
};
