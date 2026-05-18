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

const codeforcesUserInfoSchema = z.object({
  handle: z.string(),
  lastOnlineTimeSeconds: z.number().optional(),
  maxRating: z.number().optional(),
  rating: z.number().optional(),
});

const codeforcesUserInfoListSchema = z.array(codeforcesUserInfoSchema);

export type CodeforcesUserInfoDto = z.infer<typeof codeforcesUserInfoSchema>;

const codeforcesSubmissionProblemSchema = z
  .object({
    contestId: z.number().optional(),
    index: z.union([z.number(), z.string()]),
    problemsetName: z.string().optional(),
  })
  .refine(
    (problem) =>
      problem.contestId !== undefined || problem.problemsetName !== undefined
  );

const codeforcesSubmissionSchema = z.object({
  creationTimeSeconds: z.number(),
  problem: codeforcesSubmissionProblemSchema,
  verdict: z.string().optional(),
});

export type CodeforcesSubmissionDto = z.infer<
  typeof codeforcesSubmissionSchema
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

const userInfo = async (params: { handles: string }) => {
  const result = await loadCodeforcesResult(
    "user.info",
    {
      handles: params.handles,
    },
    params.handles
  );
  const userInfoList = codeforcesUserInfoListSchema.safeParse(result);

  if (!userInfoList.success) {
    throw new Error(`Codeforces user.info ${params.handles} result is invalid`);
  }

  return userInfoList.data;
};

const userStatus = async (params: { handle: string }) => {
  const result = await loadCodeforcesResult(
    "user.status",
    {
      handle: params.handle,
    },
    params.handle
  );

  if (!Array.isArray(result)) {
    throw new Error(
      `Codeforces user.status ${params.handle} result is not an array`
    );
  }

  return result.flatMap((submission) => {
    const parsedSubmission = codeforcesSubmissionSchema.safeParse(submission);

    return parsedSubmission.success ? [parsedSubmission.data] : [];
  });
};

export const codeforcesSource = {
  userInfo,
  userStatus,
};
