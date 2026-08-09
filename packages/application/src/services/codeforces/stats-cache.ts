import type { Database, DatabaseTransaction } from "@hhuacm-dashboard/db";
import { codeforcesAccountStats } from "@hhuacm-dashboard/db/schema/codeforces-account-stats";
import { eq } from "drizzle-orm";
import { ensureAccountStatsRefresh } from "../../refresh/account-stats";
import type { CodeforcesAccount, PublicCodeforcesStats } from "./types";

const codeforcesStatsFields = {
  acceptedProblemCount: codeforcesAccountStats.acceptedProblemCount,
  acceptedProblemCountInMonth:
    codeforcesAccountStats.acceptedProblemCountInMonth,
  accountId: codeforcesAccountStats.accountId,
  fetchedAt: codeforcesAccountStats.fetchedAt,
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
  const currentStats = await getCodeforcesStats(db, account.id);
  const syncStatus = await ensureAccountStatsRefresh(db, {
    accountId: account.id,
    fetchedAt: currentStats?.fetchedAt ?? null,
    lastError: currentStats?.lastError ?? null,
    platform: "codeforces",
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
  db: Database | DatabaseTransaction,
  accountId: string
) => {
  await db
    .delete(codeforcesAccountStats)
    .where(eq(codeforcesAccountStats.accountId, accountId));
};
