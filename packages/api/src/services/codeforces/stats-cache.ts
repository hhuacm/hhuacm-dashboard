import { codeforcesAccountStats } from "@hhuacm-dashboard/db/schema/codeforces-account-stats";
import { eq } from "drizzle-orm";

import type { Context } from "../../context";
import { ensureCodeforcesAccountStatsRefresh } from "../refresh/ensure";
import type { CodeforcesAccount, PublicCodeforcesStats } from "./types";

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

const getCodeforcesStats = async (db: Database, accountId: string) =>
  (
    await db
      .select(codeforcesStatsFields)
      .from(codeforcesAccountStats)
      .where(eq(codeforcesAccountStats.accountId, accountId))
      .limit(1)
  )[0] ?? null;

const isStatsForCurrentHandle = (
  stats: Awaited<ReturnType<typeof getCodeforcesStats>>,
  account: CodeforcesAccount
) => stats?.handle.toLowerCase() === account.handle.toLowerCase();

const serializeCodeforcesStats = (
  stats: NonNullable<Awaited<ReturnType<typeof getCodeforcesStats>>>,
  options: {
    isStale: boolean;
    lastError?: null | string;
    syncStatus: PublicCodeforcesStats["syncStatus"];
  }
): PublicCodeforcesStats => ({
  acceptedProblemCount: stats.acceptedProblemCount,
  acceptedProblemCountInMonth: stats.acceptedProblemCountInMonth,
  fetchedAt: toIsoString(stats.fetchedAt),
  handle: stats.handle,
  isStale: options.isStale,
  lastAttemptedAt: stats.lastAttemptedAt.toISOString(),
  lastError: options.lastError ?? stats.lastError,
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
  const canDisplayCurrentStats = isStatsForCurrentHandle(currentStats, account);
  const refreshQueueState = await ensureCodeforcesAccountStatsRefresh(db, {
    accountHandle: account.handle,
    accountId: account.id,
    fetchedAt: currentStats?.fetchedAt ?? null,
    now,
    statsHandle: currentStats?.handle ?? null,
  });
  const lastError = canDisplayCurrentStats
    ? (currentStats?.lastError ?? null)
    : null;
  const syncStatus = (() => {
    if (refreshQueueState.isQueued) {
      return "refreshing";
    }

    if (lastError) {
      return "failed";
    }

    return canDisplayCurrentStats ? "ready" : "empty";
  })();

  if (!(currentStats && canDisplayCurrentStats)) {
    return {
      acceptedProblemCount: null,
      acceptedProblemCountInMonth: null,
      fetchedAt: null,
      handle: account.handle,
      isStale: true,
      lastAttemptedAt:
        refreshQueueState.requestedAt?.toISOString() ?? now.toISOString(),
      lastError,
      lastOnlineAt: null,
      maxRating: null,
      rating: null,
      syncStatus,
    };
  }

  return serializeCodeforcesStats(currentStats, {
    isStale: !refreshQueueState.isFresh,
    lastError,
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
