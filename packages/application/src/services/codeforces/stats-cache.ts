import type { Database } from "@hhuacm-dashboard/db";
import { codeforcesAccountStats } from "@hhuacm-dashboard/db/schema/codeforces-account-stats";
import { eq } from "drizzle-orm";
import { ensureCodeforcesAccountStatsRefresh } from "../../refresh/ensure";
import { getRefreshSyncStatus } from "../../refresh/sync-status";
import type { CodeforcesAccount, PublicCodeforcesStats } from "./types";

const codeforcesStatsFields = {
  acceptedProblemCount: codeforcesAccountStats.acceptedProblemCount,
  acceptedProblemCountInMonth:
    codeforcesAccountStats.acceptedProblemCountInMonth,
  accountId: codeforcesAccountStats.accountId,
  fetchedAt: codeforcesAccountStats.fetchedAt,
  lastAttemptedAt: codeforcesAccountStats.lastAttemptedAt,
  lastError: codeforcesAccountStats.lastError,
  lastOnlineAt: codeforcesAccountStats.lastOnlineAt,
  maxRating: codeforcesAccountStats.maxRating,
  rating: codeforcesAccountStats.rating,
} as const;

const toIsoString = (date: Date | null) => date?.toISOString() ?? null;

const getCodeforcesStats = async (db: Database, accountId: string) =>
  (
    await db
      .select(codeforcesStatsFields)
      .from(codeforcesAccountStats)
      .where(eq(codeforcesAccountStats.accountId, accountId))
      .limit(1)
  )[0] ?? null;

const serializeCodeforcesStats = (
  stats: NonNullable<Awaited<ReturnType<typeof getCodeforcesStats>>>,
  options: {
    syncStatus: PublicCodeforcesStats["syncStatus"];
  }
): PublicCodeforcesStats => ({
  acceptedProblemCount: stats.acceptedProblemCount,
  acceptedProblemCountInMonth: stats.acceptedProblemCountInMonth,
  fetchedAt: toIsoString(stats.fetchedAt),
  lastOnlineAt: toIsoString(stats.lastOnlineAt),
  maxRating: stats.maxRating,
  rating: stats.rating,
  syncStatus: options.syncStatus,
});

export const getCodeforcesStatsForProfile = async (
  db: Database,
  account: CodeforcesAccount
): Promise<PublicCodeforcesStats | null> => {
  const now = new Date();
  const currentStats = await getCodeforcesStats(db, account.id);
  const refreshQueueState = await ensureCodeforcesAccountStatsRefresh(db, {
    accountId: account.id,
    fetchedAt: currentStats?.fetchedAt ?? null,
    now,
  });
  const lastError = currentStats?.lastError ?? null;
  const syncStatus = getRefreshSyncStatus({
    fetchedAt: currentStats?.fetchedAt ?? null,
    isQueued: refreshQueueState.isQueued,
    lastError,
  });

  if (!currentStats?.fetchedAt) {
    return {
      acceptedProblemCount: null,
      acceptedProblemCountInMonth: null,
      fetchedAt: null,
      lastOnlineAt: null,
      maxRating: null,
      rating: null,
      syncStatus,
    };
  }

  return serializeCodeforcesStats(currentStats, {
    syncStatus,
  });
};

export const deleteCodeforcesStats = async (
  db: Database,
  accountId: string
) => {
  await db
    .delete(codeforcesAccountStats)
    .where(eq(codeforcesAccountStats.accountId, accountId));
};
