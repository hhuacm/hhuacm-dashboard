import type { Database } from "@hhuacm-dashboard/db";
import { nowcoderAccountStats } from "@hhuacm-dashboard/db/schema/nowcoder-account-stats";
import { eq } from "drizzle-orm";
import { ensureNowcoderAccountStatsRefresh } from "../../refresh/ensure";
import {
  getRefreshSyncStatus,
  type RefreshSyncStatus,
} from "../../refresh/sync-status";
import type { NowcoderAccount } from "./types";

export interface PublicNowcoderStats {
  acceptedProblemCount: null | number;
  fetchedAt: null | string;
  rating: null | number;
  syncStatus: RefreshSyncStatus;
}

const nowcoderStatsFields = {
  acceptedProblemCount: nowcoderAccountStats.acceptedProblemCount,
  accountId: nowcoderAccountStats.accountId,
  fetchedAt: nowcoderAccountStats.fetchedAt,
  lastAttemptedAt: nowcoderAccountStats.lastAttemptedAt,
  lastError: nowcoderAccountStats.lastError,
  rating: nowcoderAccountStats.rating,
} as const;

const toIsoString = (date: Date | null) => date?.toISOString() ?? null;

const getNowcoderStats = async (db: Database, accountId: string) =>
  (
    await db
      .select(nowcoderStatsFields)
      .from(nowcoderAccountStats)
      .where(eq(nowcoderAccountStats.accountId, accountId))
      .limit(1)
  )[0] ?? null;

const serializeNowcoderStats = (
  stats: NonNullable<Awaited<ReturnType<typeof getNowcoderStats>>>,
  options: {
    syncStatus: PublicNowcoderStats["syncStatus"];
  }
): PublicNowcoderStats => ({
  acceptedProblemCount: stats.acceptedProblemCount,
  fetchedAt: toIsoString(stats.fetchedAt),
  rating: stats.rating,
  syncStatus: options.syncStatus,
});

export const getNowcoderStatsForProfile = async (
  db: Database,
  account: NowcoderAccount
): Promise<PublicNowcoderStats | null> => {
  const now = new Date();
  const currentStats = await getNowcoderStats(db, account.id);
  const refreshQueueState = await ensureNowcoderAccountStatsRefresh(db, {
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
      acceptedProblemCount: null,
      fetchedAt: null,
      rating: null,
      syncStatus,
    };
  }

  return serializeNowcoderStats(currentStats, {
    syncStatus,
  });
};
