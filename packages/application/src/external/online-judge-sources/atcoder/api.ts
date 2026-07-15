import { z } from "zod";

import { requestExternalResource } from "../../request";

const atcoderBaseUrl = "https://atcoder.jp";

const atcoderUserHistoryItemSchema = z.looseObject({
  ContestName: z.string(),
  ContestNameEn: z.string(),
  ContestScreenName: z.string(),
  EndTime: z.string(),
  InnerPerformance: z.number(),
  IsRated: z.boolean(),
  NewRating: z.number(),
  OldRating: z.number(),
  Performance: z.number(),
  Place: z.number(),
});

const atcoderUserHistorySchema = z.array(atcoderUserHistoryItemSchema);

export type AtCoderUserHistory = z.infer<typeof atcoderUserHistorySchema>;

const buildAtCoderUserHistoryUrl = (userId: string) =>
  new URL(`/users/${encodeURIComponent(userId)}/history/json`, atcoderBaseUrl);

const userHistory = async (params: {
  userId: string;
}): Promise<AtCoderUserHistory> => {
  const response = await requestExternalResource({
    label: `AtCoder user history ${params.userId}`,
    request: async (signal) =>
      await fetch(buildAtCoderUserHistoryUrl(params.userId), { signal }),
  });

  if (!response.ok) {
    throw new Error(
      `AtCoder user history ${params.userId} HTTP ${response.status}`
    );
  }

  const payload: unknown = await response.json();
  const history = atcoderUserHistorySchema.safeParse(payload);

  if (!history.success) {
    throw new Error(
      `AtCoder user history ${params.userId} returned invalid JSON`
    );
  }

  return history.data;
};

export const atcoderSource = {
  userHistory,
};
