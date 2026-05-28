import type { Database } from "@hhuacm-dashboard/db";
import { atcoderAccountStats } from "@hhuacm-dashboard/db/schema/atcoder-account-stats";
import { eq } from "drizzle-orm";
import { ensureAtcoderAccountStatsRefresh } from "../../refresh/ensure";
import {
  getRefreshSyncStatus,
  type RefreshSyncStatus,
} from "../../refresh/sync-status";
import type { AtcoderAccount } from "./types";

export interface PublicAtcoderStats {
  fetchedAt: null | string;
  rating: null | number;
  recentPerformanceAverage: null | number;
  syncStatus: RefreshSyncStatus;
}

const atcoderStatsFields = {
  accountId: atcoderAccountStats.accountId,
  fetchedAt: atcoderAccountStats.fetchedAt,
  lastAttemptedAt: atcoderAccountStats.lastAttemptedAt,
  lastError: atcoderAccountStats.lastError,
  rating: atcoderAccountStats.rating,
  recentPerformanceAverage: atcoderAccountStats.recentPerformanceAverage,
} as const;

const toIsoString = (date: Date | null) => date?.toISOString() ?? null;

const getAtcoderStats = async (db: Database, accountId: string) =>
  (
    await db
      .select(atcoderStatsFields)
      .from(atcoderAccountStats)
      .where(eq(atcoderAccountStats.accountId, accountId))
      .limit(1)
  )[0] ?? null;

const serializeAtcoderStats = (
  stats: NonNullable<Awaited<ReturnType<typeof getAtcoderStats>>>,
  options: {
    syncStatus: PublicAtcoderStats["syncStatus"];
  }
): PublicAtcoderStats => ({
  fetchedAt: toIsoString(stats.fetchedAt),
  rating: stats.rating,
  recentPerformanceAverage: stats.recentPerformanceAverage,
  syncStatus: options.syncStatus,
});

export const getAtcoderStatsForProfile = async (
  db: Database,
  account: AtcoderAccount
): Promise<PublicAtcoderStats | null> => {
  const now = new Date();
  const currentStats = await getAtcoderStats(db, account.id);
  const refreshQueueState = await ensureAtcoderAccountStatsRefresh(db, {
    accountId: account.id,
    fetchedAt: currentStats?.fetchedAt ?? null,
    now,
  });
  const syncStatus = getRefreshSyncStatus({
    fetchedAt: currentStats?.fetchedAt ?? null,
    isQueued: refreshQueueState.isQueued,
    lastError: currentStats?.lastError ?? null,
  });

  if (!currentStats?.fetchedAt) {
    return {
      fetchedAt: null,
      rating: null,
      recentPerformanceAverage: null,
      syncStatus,
    };
  }

  return serializeAtcoderStats(currentStats, {
    syncStatus,
  });
};
