import { z } from "zod";

import {
  isCommonRetryableHttpStatus,
  requestExternalResource,
} from "../../request";

const codeforcesApiBaseUrl = "https://codeforces.com/api";
const requestMaxAttempts = 3;
const requestRetryDelayMs = 500;
const requestTimeoutMs = 10_000;

const codeforcesEnvelopeSchema = z.object({
  comment: z.string().optional(),
  result: z.unknown().optional(),
  status: z.string(),
});

const codeforcesUserInfoSchema = z
  .object({
    avatar: z.string().optional(),
    city: z.string().optional(),
    contribution: z.number().optional(),
    country: z.string().optional(),
    firstName: z.string().optional(),
    friendOfCount: z.number().optional(),
    handle: z.string(),
    lastName: z.string().optional(),
    lastOnlineTimeSeconds: z.number().optional(),
    maxRank: z.string().optional(),
    maxRating: z.number().optional(),
    organization: z.string().optional(),
    rank: z.string().optional(),
    rating: z.number().optional(),
    registrationTimeSeconds: z.number().optional(),
    titlePhoto: z.string().optional(),
  })
  .passthrough();

const codeforcesUserInfoResultSchema = z.array(codeforcesUserInfoSchema);

export type CodeforcesUserInfoResult = z.infer<
  typeof codeforcesUserInfoResultSchema
>;

const codeforcesProblemSchema = z
  .object({
    contestId: z.number().optional(),
    index: z.union([z.number(), z.string()]),
    name: z.string().optional(),
    points: z.number().optional(),
    problemsetName: z.string().optional(),
    rating: z.number().optional(),
    tags: z.array(z.string()).optional(),
    type: z.string().optional(),
  })
  .passthrough();

const codeforcesPartyMemberSchema = z
  .object({
    handle: z.string().optional(),
    name: z.string().optional(),
  })
  .passthrough();

const codeforcesAuthorSchema = z
  .object({
    contestId: z.number().optional(),
    ghost: z.boolean().optional(),
    members: z.array(codeforcesPartyMemberSchema).optional(),
    participantId: z.number().optional(),
    participantType: z.string().optional(),
    room: z.number().optional(),
    startTimeSeconds: z.number().optional(),
    teamId: z.number().optional(),
    teamName: z.string().optional(),
  })
  .passthrough();

const codeforcesSubmissionSchema = z
  .object({
    author: codeforcesAuthorSchema.optional(),
    contestId: z.number().optional(),
    creationTimeSeconds: z.number(),
    id: z.number(),
    memoryConsumedBytes: z.number().optional(),
    passedTestCount: z.number().optional(),
    problem: codeforcesProblemSchema,
    programmingLanguage: z.string().optional(),
    relativeTimeSeconds: z.number().optional(),
    testset: z.string().optional(),
    timeConsumedMillis: z.number().optional(),
    verdict: z.string().optional(),
  })
  .passthrough();

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
    maxAttempts: requestMaxAttempts,
    request: async (signal) => await fetch(url, { signal }),
    retryDelayMs: requestRetryDelayMs,
    retryableStatus: isCommonRetryableHttpStatus,
    timeoutMs: requestTimeoutMs,
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
