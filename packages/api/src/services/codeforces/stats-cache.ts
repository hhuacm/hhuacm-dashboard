import { codeforcesAccountStats } from "@hhuacm-dashboard/db/schema/codeforces-account-stats";
import { eq } from "drizzle-orm";

import type { Context } from "../../context";
import { fetchCodeforcesSubmissions, fetchCodeforcesUserInfo } from "./api";
import { summarizeAcceptedProblems } from "./summary";
import type { CodeforcesAccount, PublicCodeforcesStats } from "./types";

const statsTtlMs = 30 * 60 * 1000;
const oneMonthSeconds = 30 * 24 * 60 * 60;
const maxErrorLength = 500;

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

const toIsoString = (date: Date | null) => date?.toISOString() ?? null;

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Unknown Codeforces sync error";

const truncateError = (message: string) => message.slice(0, maxErrorLength);

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
  const nowSeconds = Math.floor(now.getTime() / 1000);
  const summary = summarizeAcceptedProblems(submissions, {
    acceptedSinceSeconds: nowSeconds - oneMonthSeconds,
  });
  const fetchedAt = new Date();
  const lastOnlineAt =
    userInfo.lastOnlineTimeSeconds === undefined
      ? null
      : new Date(userInfo.lastOnlineTimeSeconds * 1000);

  const [stats] = await db
    .insert(codeforcesAccountStats)
    .values({
      acceptedProblemCount: summary.acceptedProblemCount,
      acceptedProblemCountInMonth: summary.acceptedProblemCountSince,
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
        acceptedProblemCountInMonth: summary.acceptedProblemCountSince,
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
