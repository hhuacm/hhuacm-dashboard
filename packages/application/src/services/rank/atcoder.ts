import type { Database } from "@hhuacm-dashboard/db";
import { atcoderAccountStats } from "@hhuacm-dashboard/db/schema/atcoder-account-stats";
import { currentMember } from "@hhuacm-dashboard/db/schema/current-member";
import { userOjAccount } from "@hhuacm-dashboard/db/schema/oj-account";
import { desc, eq } from "drizzle-orm";
import { getAtcoderRankRefreshActivity } from "../../refresh/activity";
import { atcoderAccountStatsJob } from "../../refresh/jobs/atcoder-account-stats";
import { isAtcoderStatsCacheFresh } from "../../refresh/policy";
import { getRefreshSyncStatus } from "../../refresh/sync-status";
import {
  ensureRankStatsRefreshRequests,
  rankUserNameOrder,
  toIsoString,
} from "./shared";

export const listAtcoderRankRows = async (db: Database) => {
  const cachedRows = await db
    .select({
      accountId: userOjAccount.id,
      externalId: userOjAccount.externalId,
      fetchedAt: atcoderAccountStats.fetchedAt,
      grade: currentMember.grade,
      handle: userOjAccount.handle,
      lastError: atcoderAccountStats.lastError,
      major: currentMember.major,
      rating: atcoderAccountStats.rating,
      realName: currentMember.realName,
      recentPerformanceAverage: atcoderAccountStats.recentPerformanceAverage,
      userId: currentMember.userId,
      username: currentMember.username,
    })
    .from(userOjAccount)
    .innerJoin(currentMember, eq(currentMember.userId, userOjAccount.userId))
    .leftJoin(
      atcoderAccountStats,
      eq(atcoderAccountStats.accountId, userOjAccount.id)
    )
    .where(eq(userOjAccount.platform, "atcoder"))
    .orderBy(
      desc(atcoderAccountStats.rating),
      desc(atcoderAccountStats.recentPerformanceAverage),
      ...rankUserNameOrder
    );

  const accountIds = cachedRows.map((row) => row.accountId);
  const now = new Date();

  await ensureRankStatsRefreshRequests({
    isFresh: isAtcoderStatsCacheFresh,
    now,
    requestRefresh: async (accountId) => {
      await atcoderAccountStatsJob.enqueue(db, accountId);
    },
    rows: cachedRows,
  });

  const refreshActivity = await getAtcoderRankRefreshActivity(db, accountIds);

  return cachedRows.map((row) => ({
    atcoder: {
      externalId: row.externalId,
      fetchedAt: toIsoString(row.fetchedAt),
      handle: row.handle,
      rating: row.rating,
      recentPerformanceAverage: row.recentPerformanceAverage,
      syncStatus: getRefreshSyncStatus(
        refreshActivity.toStatusInput({
          accountId: row.accountId,
          fetchedAt: row.fetchedAt,
          lastError: row.lastError,
        })
      ),
    },
    grade: row.grade,
    major: row.major,
    realName: row.realName,
    userId: row.userId,
    username: row.username,
  }));
};
