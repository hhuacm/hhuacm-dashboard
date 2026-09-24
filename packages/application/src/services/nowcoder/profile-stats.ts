import type { Database } from "@hhuacm-dashboard/db";
import { nowcoderAccountStats } from "@hhuacm-dashboard/db/schema/nowcoder-account-stats";
import { eq } from "drizzle-orm";
import { ensureAccountStatsRefresh } from "../../refresh/account-stats";
import type { RefreshSyncStatus } from "../../refresh/sync-status";
import type { OjAccountIdentity } from "../oj-account/queries";

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
  lastError: nowcoderAccountStats.lastError,
  rating: nowcoderAccountStats.rating,
} as const;

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
  fetchedAt: stats.fetchedAt?.toISOString() ?? null,
  rating: stats.rating,
  syncStatus: options.syncStatus,
});

export const getNowcoderStatsForProfile = async (
  db: Database,
  account: OjAccountIdentity
): Promise<PublicNowcoderStats | null> => {
  const currentStats = await getNowcoderStats(db, account.id);
  const syncStatus = await ensureAccountStatsRefresh(db, {
    accountId: account.id,
    fetchedAt: currentStats?.fetchedAt ?? null,
    lastError: currentStats?.lastError ?? null,
    platform: "nowcoder",
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
