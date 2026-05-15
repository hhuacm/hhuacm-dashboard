import { codeforcesAccountStats } from "@hhuacm-dashboard/db/schema/codeforces-account-stats";
import { eq } from "drizzle-orm";
import { z } from "zod";

import type { Context } from "../../context";

const codeforcesApiBaseUrl = "https://codeforces.com/api";
const requestTimeoutMs = 10_000;
const statsTtlMs = 30 * 60 * 1000;
const oneMonthSeconds = 30 * 24 * 60 * 60;
const maxErrorLength = 500;

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

interface CodeforcesAccount {
  handle: string;
  id: string;
}

interface CodeforcesProblemSummary {
  acceptedProblemCount: number;
  acceptedProblemCountInMonth: number;
}

export interface PublicCodeforcesStats {
  acceptedProblemCount: null | number;
  acceptedProblemCountInMonth: null | number;
  fetchedAt: null | string;
  handle: string;
  lastAttemptedAt: string;
  lastError: null | string;
  lastOnlineAt: null | string;
  maxRating: null | number;
  rating: null | number;
  syncStatus: "failed" | "ready";
}

type Database = Context["db"];

const codeforcesStatsFields = {
  acceptedProblemCount: codeforcesAccountStats.acceptedProblemCount,
  acceptedProblemCountInMonth:
    codeforcesAccountStats.acceptedProblemCountInMonth,
  accountId: codeforcesAccountStats.accountId,
  fetchedAt: codeforcesAccountStats.fetchedAt,
  handle: codeforcesAccountStats.handle,
  lastAttemptedAt: codeforcesAccountStats.lastAttemptedAt,
  lastError: codeforcesAccountStats.lastError,
  lastOnlineAt: codeforcesAccountStats.lastOnlineAt,
  maxRating: codeforcesAccountStats.maxRating,
  rating: codeforcesAccountStats.rating,
} as const;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const toProblemKeyPart = (value: unknown) => {
  if (typeof value === "number" || typeof value === "string") {
    return String(value);
  }

  return null;
};

const toTimestampSeconds = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const toIsoString = (date: Date | null) => date?.toISOString() ?? null;

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Unknown Codeforces sync error";

const truncateError = (message: string) => message.slice(0, maxErrorLength);

const buildCodeforcesApiUrl = (
  endpoint: "user.info" | "user.status",
  searchParams: Record<string, string>
) => {
  const url = new URL(`${codeforcesApiBaseUrl}/${endpoint}`);

  for (const [key, value] of Object.entries(searchParams)) {
    url.searchParams.set(key, value);
  }

  return url;
};

const loadCodeforcesResult = async (
  endpoint: "user.info" | "user.status",
  searchParams: Record<string, string>,
  handle: string
) => {
  const url = buildCodeforcesApiUrl(endpoint, searchParams);
  const response = await fetch(url, {
    signal: AbortSignal.timeout(requestTimeoutMs),
  });

  if (!response.ok) {
    throw new Error(`Codeforces ${endpoint} ${handle} HTTP ${response.status}`);
  }

  const payload: unknown = await response.json();
  const envelope = codeforcesEnvelopeSchema.safeParse(payload);

  if (!envelope.success) {
    throw new Error(`Codeforces ${endpoint} ${handle} returned invalid JSON`);
  }

  if (envelope.data.status !== "OK" || envelope.data.result === undefined) {
    throw new Error(
      `Codeforces ${endpoint} ${handle} returned ${envelope.data.status}${
        envelope.data.comment ? `: ${envelope.data.comment}` : ""
      }`
    );
  }

  return envelope.data.result;
};

const fetchCodeforcesUserInfo = async (handle: string) => {
  const result = await loadCodeforcesResult(
    "user.info",
    { handles: handle },
    handle
  );

  if (!Array.isArray(result)) {
    throw new Error(`Codeforces user.info ${handle} result is not an array`);
  }

  const userInfo = codeforcesUserInfoSchema.safeParse(result[0]);

  if (!userInfo.success) {
    throw new Error(`Codeforces user.info ${handle} result is invalid`);
  }

  return userInfo.data;
};

const fetchCodeforcesSubmissions = async (handle: string) => {
  const result = await loadCodeforcesResult("user.status", { handle }, handle);

  if (!Array.isArray(result)) {
    throw new Error(`Codeforces user.status ${handle} result is not an array`);
  }

  return result;
};

export const summarizeAcceptedProblems = (
  submissions: unknown[],
  nowSeconds = Math.floor(Date.now() / 1000)
): CodeforcesProblemSummary => {
  const firstAcceptedAtByProblem = new Map<string, number>();

  for (const submission of submissions) {
    if (!isRecord(submission) || submission.verdict !== "OK") {
      continue;
    }

    if (!isRecord(submission.problem)) {
      continue;
    }

    const problemNamespace = toProblemKeyPart(
      submission.problem.contestId ?? submission.problem.problemsetName
    );
    const problemIndex = toProblemKeyPart(submission.problem.index);
    const createdAt = toTimestampSeconds(submission.creationTimeSeconds);

    if (
      problemNamespace === null ||
      problemIndex === null ||
      createdAt === null
    ) {
      continue;
    }

    const problemId = `${problemNamespace}${problemIndex}`;
    const currentFirstAcceptedAt = firstAcceptedAtByProblem.get(problemId);

    if (
      currentFirstAcceptedAt === undefined ||
      createdAt < currentFirstAcceptedAt
    ) {
      firstAcceptedAtByProblem.set(problemId, createdAt);
    }
  }

  const oneMonthAgo = nowSeconds - oneMonthSeconds;
  let acceptedProblemCountInMonth = 0;

  for (const firstAcceptedAt of firstAcceptedAtByProblem.values()) {
    if (firstAcceptedAt >= oneMonthAgo) {
      acceptedProblemCountInMonth += 1;
    }
  }

  return {
    acceptedProblemCount: firstAcceptedAtByProblem.size,
    acceptedProblemCountInMonth,
  };
};

const getCodeforcesStats = async (db: Database, accountId: string) =>
  (
    await db
      .select(codeforcesStatsFields)
      .from(codeforcesAccountStats)
      .where(eq(codeforcesAccountStats.accountId, accountId))
      .limit(1)
  )[0] ?? null;

const isFreshCodeforcesStats = (
  stats: Awaited<ReturnType<typeof getCodeforcesStats>>,
  account: CodeforcesAccount,
  now: Date
) => {
  if (!stats?.fetchedAt) {
    return false;
  }

  if (stats.handle.toLowerCase() !== account.handle.toLowerCase()) {
    return false;
  }

  return now.getTime() - stats.fetchedAt.getTime() < statsTtlMs;
};

const serializeCodeforcesStats = (
  stats: NonNullable<Awaited<ReturnType<typeof getCodeforcesStats>>>
): PublicCodeforcesStats => ({
  acceptedProblemCount: stats.acceptedProblemCount,
  acceptedProblemCountInMonth: stats.acceptedProblemCountInMonth,
  fetchedAt: toIsoString(stats.fetchedAt),
  handle: stats.handle,
  lastAttemptedAt: stats.lastAttemptedAt.toISOString(),
  lastError: stats.lastError,
  lastOnlineAt: toIsoString(stats.lastOnlineAt),
  maxRating: stats.maxRating,
  rating: stats.rating,
  syncStatus: stats.lastError ? "failed" : "ready",
});

const refreshCodeforcesStats = async (
  db: Database,
  account: CodeforcesAccount,
  now: Date
) => {
  const userInfo = await fetchCodeforcesUserInfo(account.handle);
  const submissions = await fetchCodeforcesSubmissions(userInfo.handle);
  const summary = summarizeAcceptedProblems(
    submissions,
    Math.floor(now.getTime() / 1000)
  );
  const fetchedAt = new Date();
  const lastOnlineAt =
    userInfo.lastOnlineTimeSeconds === undefined
      ? null
      : new Date(userInfo.lastOnlineTimeSeconds * 1000);

  const [stats] = await db
    .insert(codeforcesAccountStats)
    .values({
      acceptedProblemCount: summary.acceptedProblemCount,
      acceptedProblemCountInMonth: summary.acceptedProblemCountInMonth,
      accountId: account.id,
      fetchedAt,
      handle: userInfo.handle,
      lastAttemptedAt: fetchedAt,
      lastError: null,
      lastOnlineAt,
      maxRating: userInfo.maxRating ?? null,
      rating: userInfo.rating ?? null,
    })
    .onConflictDoUpdate({
      set: {
        acceptedProblemCount: summary.acceptedProblemCount,
        acceptedProblemCountInMonth: summary.acceptedProblemCountInMonth,
        fetchedAt,
        handle: userInfo.handle,
        lastAttemptedAt: fetchedAt,
        lastError: null,
        lastOnlineAt,
        maxRating: userInfo.maxRating ?? null,
        rating: userInfo.rating ?? null,
        updatedAt: fetchedAt,
      },
      target: codeforcesAccountStats.accountId,
    })
    .returning(codeforcesStatsFields);

  if (!stats) {
    throw new Error(`Codeforces stats write failed for ${account.handle}`);
  }

  return stats;
};

const markCodeforcesRefreshFailed = async (
  db: Database,
  account: CodeforcesAccount,
  now: Date,
  error: unknown
) => {
  const lastError = truncateError(getErrorMessage(error));
  const [stats] = await db
    .insert(codeforcesAccountStats)
    .values({
      accountId: account.id,
      handle: account.handle,
      lastAttemptedAt: now,
      lastError,
    })
    .onConflictDoUpdate({
      set: {
        handle: account.handle,
        lastAttemptedAt: now,
        lastError,
        updatedAt: now,
      },
      target: codeforcesAccountStats.accountId,
    })
    .returning(codeforcesStatsFields);

  if (stats) {
    return stats;
  }

  return await getCodeforcesStats(db, account.id);
};

export const getFreshCodeforcesStats = async (
  db: Database,
  account: CodeforcesAccount
): Promise<PublicCodeforcesStats | null> => {
  const now = new Date();
  const currentStats = await getCodeforcesStats(db, account.id);

  if (currentStats && isFreshCodeforcesStats(currentStats, account, now)) {
    return serializeCodeforcesStats(currentStats);
  }

  try {
    const refreshedStats = await refreshCodeforcesStats(db, account, now);
    return serializeCodeforcesStats(refreshedStats);
  } catch (error) {
    const failedStats = await markCodeforcesRefreshFailed(
      db,
      account,
      now,
      error
    );

    return failedStats ? serializeCodeforcesStats(failedStats) : null;
  }
};

export const deleteCodeforcesStats = async (
  db: Database,
  accountId: string
) => {
  await db
    .delete(codeforcesAccountStats)
    .where(eq(codeforcesAccountStats.accountId, accountId));
};
