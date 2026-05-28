import type { Database } from "@hhuacm-dashboard/db";
import { atcoderAccountStats } from "@hhuacm-dashboard/db/schema/atcoder-account-stats";
import { eq } from "drizzle-orm";
import type { AtCoderUserHistory } from "../../external/online-judge-sources/atcoder/api";
import { atcoderSource } from "../../external/online-judge-sources/atcoder/api";
import { truncateRefreshError } from "../../refresh/policy";
import type { AtcoderAccount } from "./types";

type AtcoderHistoryLoader = typeof atcoderSource.userHistory;
type AtcoderHistoryItem = AtCoderUserHistory[number];

const atcoderStatsFields = {
  accountId: atcoderAccountStats.accountId,
  fetchedAt: atcoderAccountStats.fetchedAt,
  lastAttemptedAt: atcoderAccountStats.lastAttemptedAt,
  lastError: atcoderAccountStats.lastError,
  rating: atcoderAccountStats.rating,
  recentPerformanceAverage: atcoderAccountStats.recentPerformanceAverage,
} as const;

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Unknown AtCoder sync error";

const compareByEndTimeDesc = (
  left: AtcoderHistoryItem,
  right: AtcoderHistoryItem
) => Date.parse(right.EndTime) - Date.parse(left.EndTime);

const summarizeRatedHistory = (history: AtCoderUserHistory) => {
  const recentRatedHistory = history
    .filter((item) => item.IsRated)
    .toSorted(compareByEndTimeDesc);
  const [latestRatedContest] = recentRatedHistory;
  const recentPerformances = recentRatedHistory
    .slice(0, 3)
    .map((item) => item.Performance);

  return {
    rating: latestRatedContest?.NewRating ?? null,
    recentPerformanceAverage:
      recentPerformances.length === 0
        ? null
        : Math.floor(
            recentPerformances.reduce(
              (sum, performance) => sum + performance,
              0
            ) / recentPerformances.length
          ),
  };
};

export const syncAtcoderAccountStats = async (
  db: Database,
  account: AtcoderAccount,
  now = new Date(),
  loadHistory: AtcoderHistoryLoader = atcoderSource.userHistory
) => {
  const summary = summarizeRatedHistory(
    await loadHistory({ userId: account.externalId })
  );
  const fetchedAt = now;

  const [stats] = await db
    .insert(atcoderAccountStats)
    .values({
      accountId: account.id,
      fetchedAt,
      lastAttemptedAt: fetchedAt,
      lastError: null,
      rating: summary.rating,
      recentPerformanceAverage: summary.recentPerformanceAverage,
    })
    .onConflictDoUpdate({
      set: {
        fetchedAt,
        lastAttemptedAt: fetchedAt,
        lastError: null,
        rating: summary.rating,
        recentPerformanceAverage: summary.recentPerformanceAverage,
      },
      target: atcoderAccountStats.accountId,
    })
    .returning(atcoderStatsFields);

  if (!stats) {
    throw new Error(`AtCoder stats write failed for ${account.externalId}`);
  }

  return stats;
};

export const markAtcoderAccountStatsRefreshFailed = async (
  db: Database,
  account: AtcoderAccount,
  error: unknown,
  now = new Date()
) => {
  const lastError = truncateRefreshError(getErrorMessage(error));

  const [stats] = await db
    .insert(atcoderAccountStats)
    .values({
      accountId: account.id,
      lastAttemptedAt: now,
      lastError,
    })
    .onConflictDoUpdate({
      set: {
        lastAttemptedAt: now,
        lastError,
      },
      target: atcoderAccountStats.accountId,
    })
    .returning(atcoderStatsFields);

  if (!stats) {
    throw new Error(`AtCoder failure write failed for ${account.externalId}`);
  }

  return stats;
};

export const deleteAtcoderStats = async (db: Database, accountId: string) => {
  await db
    .delete(atcoderAccountStats)
    .where(eq(atcoderAccountStats.accountId, accountId));
};
