import { z } from "zod";

import { requestExternalResource } from "../../request";

const codeforcesApiBaseUrl = "https://codeforces.com/api";

const codeforcesEnvelopeSchema = z.object({
  comment: z.string().optional(),
  result: z.unknown().optional(),
  status: z.string(),
});

const codeforcesUserInfoSchema = z.looseObject({
  handle: z.string(),
  lastOnlineTimeSeconds: z.number().optional(),
  maxRating: z.number().optional(),
  rating: z.number().optional(),
});

const codeforcesUserInfoResultSchema = z.array(codeforcesUserInfoSchema);

export type CodeforcesUserInfoResult = z.infer<
  typeof codeforcesUserInfoResultSchema
>;

const codeforcesProblemSchema = z.looseObject({
  contestId: z.number().optional(),
  index: z.union([z.number(), z.string()]),
  problemsetName: z.string().optional(),
});

const codeforcesSubmissionSchema = z.looseObject({
  creationTimeSeconds: z.number(),
  problem: codeforcesProblemSchema,
  verdict: z.string().optional(),
});

const codeforcesSubmissionResultSchema = z.array(codeforcesSubmissionSchema);

export type CodeforcesSubmissionResult = z.infer<
  typeof codeforcesSubmissionResultSchema
>;

type CodeforcesEndpoint = "user.info" | "user.status";

const buildCodeforcesApiUrl = (
  endpoint: CodeforcesEndpoint,
  searchParams: Record<string, string>
) => {
  const url = new URL(`${codeforcesApiBaseUrl}/${endpoint}`);

  for (const [key, value] of Object.entries(searchParams)) {
    url.searchParams.set(key, value);
  }

  return url;
};

const loadCodeforcesResult = async (
  endpoint: CodeforcesEndpoint,
  searchParams: Record<string, string>,
  requestLabel: string
) => {
  const url = buildCodeforcesApiUrl(endpoint, searchParams);
  const response = await requestExternalResource({
    label: `Codeforces ${endpoint} ${requestLabel}`,
    request: async (signal) => await fetch(url, { signal }),
  });

  if (!response.ok) {
    throw new Error(
      `Codeforces ${endpoint} ${requestLabel} HTTP ${response.status}`
    );
  }

  const payload: unknown = await response.json();
  const envelope = codeforcesEnvelopeSchema.safeParse(payload);

  if (!envelope.success) {
    throw new Error(
      `Codeforces ${endpoint} ${requestLabel} returned invalid JSON`
    );
  }

  if (envelope.data.status !== "OK" || envelope.data.result === undefined) {
    throw new Error(
      `Codeforces ${endpoint} ${requestLabel} returned ${envelope.data.status}${
        envelope.data.comment ? `: ${envelope.data.comment}` : ""
      }`
    );
  }

  return envelope.data.result;
};

const userInfo = async (params: {
  handles: string;
}): Promise<CodeforcesUserInfoResult> => {
  const result = await loadCodeforcesResult(
    "user.info",
    {
      handles: params.handles,
    },
    params.handles
  );
  const userInfo = codeforcesUserInfoResultSchema.safeParse(result);

  if (!userInfo.success) {
    throw new Error(`Codeforces user.info ${params.handles} result is invalid`);
  }

  return userInfo.data;
};

const userStatus = async (params: {
  handle: string;
}): Promise<CodeforcesSubmissionResult> => {
  const result = await loadCodeforcesResult(
    "user.status",
    {
      handle: params.handle,
    },
    params.handle
  );
  const submissions = codeforcesSubmissionResultSchema.safeParse(result);

  if (!submissions.success) {
    throw new Error(
      `Codeforces user.status ${params.handle} result is invalid`
    );
  }

  return submissions.data;
};

export const codeforcesSource = {
  userInfo,
  userStatus,
};
