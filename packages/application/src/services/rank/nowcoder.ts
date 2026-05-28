import type { Database } from "@hhuacm-dashboard/db";
import { currentMember } from "@hhuacm-dashboard/db/schema/current-member";
import { nowcoderAccountStats } from "@hhuacm-dashboard/db/schema/nowcoder-account-stats";
import { userOjAccount } from "@hhuacm-dashboard/db/schema/oj-account";
import { desc, eq } from "drizzle-orm";
import { getNowcoderRankRefreshActivity } from "../../refresh/activity";
import { nowcoderAccountStatsJob } from "../../refresh/jobs/nowcoder-account-stats";
import { isNowcoderStatsCacheFresh } from "../../refresh/policy";
import { getRefreshSyncStatus } from "../../refresh/sync-status";
import {
  ensureRankStatsRefreshRequests,
  rankUserNameOrder,
  toIsoString,
} from "./shared";

export const listNowcoderRankRows = async (db: Database) => {
  const cachedRows = await db
    .select({
      acceptedProblemCount: nowcoderAccountStats.acceptedProblemCount,
      accountId: userOjAccount.id,
      externalId: userOjAccount.externalId,
      fetchedAt: nowcoderAccountStats.fetchedAt,
      grade: currentMember.grade,
      handle: userOjAccount.handle,
      lastError: nowcoderAccountStats.lastError,
      major: currentMember.major,
      rating: nowcoderAccountStats.rating,
      realName: currentMember.realName,
      userId: currentMember.userId,
      username: currentMember.username,
    })
    .from(userOjAccount)
    .innerJoin(currentMember, eq(currentMember.userId, userOjAccount.userId))
    .leftJoin(
      nowcoderAccountStats,
      eq(nowcoderAccountStats.accountId, userOjAccount.id)
    )
    .where(eq(userOjAccount.platform, "nowcoder"))
    .orderBy(
      desc(nowcoderAccountStats.acceptedProblemCount),
      desc(nowcoderAccountStats.rating),
      ...rankUserNameOrder
    );

  const accountIds = cachedRows.map((row) => row.accountId);
  const now = new Date();

  await ensureRankStatsRefreshRequests({
    isFresh: isNowcoderStatsCacheFresh,
    now,
    requestRefresh: async (accountId) => {
      await nowcoderAccountStatsJob.enqueue(db, accountId);
    },
    rows: cachedRows,
  });

  const refreshActivity = await getNowcoderRankRefreshActivity(db, accountIds);

  return cachedRows.map((row) => ({
    grade: row.grade,
    major: row.major,
    nowcoder: {
      acceptedProblemCount: row.acceptedProblemCount,
      externalId: row.externalId,
      fetchedAt: toIsoString(row.fetchedAt),
      handle: row.handle,
      rating: row.rating,
      syncStatus: getRefreshSyncStatus(
        refreshActivity.toStatusInput({
          accountId: row.accountId,
          fetchedAt: row.fetchedAt,
          lastError: row.lastError,
        })
      ),
    },
    realName: row.realName,
    userId: row.userId,
    username: row.username,
  }));
};
