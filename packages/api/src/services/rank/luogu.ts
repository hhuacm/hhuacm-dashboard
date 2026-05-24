import { currentMember } from "@hhuacm-dashboard/db/schema/current-member";
import { luoguAccountStats } from "@hhuacm-dashboard/db/schema/luogu-account-stats";
import { userOjAccount } from "@hhuacm-dashboard/db/schema/oj-account";
import { asc, desc, eq, sql } from "drizzle-orm";

import type { Context } from "../../context";
import { getLuoguRankRefreshActivity } from "../refresh/activity";
import { enqueueRefreshIfDue } from "../refresh/ensure";
import { isLuoguStatsCacheFresh } from "../refresh/policy";
import { requestLuoguAccountStatsRefresh } from "../refresh/requests";
import { getRefreshSyncStatus } from "../refresh/sync-status";

type Database = Context["db"];

const userNameLabelSortExpression = sql<string>`coalesce(nullif(trim(${currentMember.realName}), ''), nullif(trim(${currentMember.username}), ''), '')`;

const toIsoString = (date: Date | null) => date?.toISOString() ?? null;

const ensureLuoguRankStatsRefreshRequests = async (
  db: Database,
  rows: { accountId: string; fetchedAt: Date | null }[],
  now: Date
) => {
  for (const row of rows) {
    await enqueueRefreshIfDue({
      fetchedAt: row.fetchedAt,
      isFresh: isLuoguStatsCacheFresh,
      now,
      requestRefresh: async () =>
        await requestLuoguAccountStatsRefresh(db, row.accountId),
    });
  }
};

export const listLuoguRankRows = async (db: Database) => {
  const cachedRows = await db
    .select({
      acceptedProblemCount: luoguAccountStats.acceptedProblemCount,
      acceptedWeightedScore: luoguAccountStats.acceptedWeightedScore,
      accountId: userOjAccount.id,
      averageAcceptedDifficulty: luoguAccountStats.averageAcceptedDifficulty,
      fetchedAt: luoguAccountStats.fetchedAt,
      grade: currentMember.grade,
      handle: userOjAccount.handle,
      lastError: luoguAccountStats.lastError,
      major: currentMember.major,
      profileUrl: userOjAccount.profileUrl,
      realName: currentMember.realName,
      userId: currentMember.userId,
      username: currentMember.username,
    })
    .from(userOjAccount)
    .innerJoin(currentMember, eq(currentMember.userId, userOjAccount.userId))
    .leftJoin(
      luoguAccountStats,
      eq(luoguAccountStats.accountId, userOjAccount.id)
    )
    .where(eq(userOjAccount.platform, "luogu"))
    .orderBy(
      desc(luoguAccountStats.acceptedWeightedScore),
      desc(luoguAccountStats.acceptedProblemCount),
      desc(luoguAccountStats.averageAcceptedDifficulty),
      asc(userNameLabelSortExpression),
      asc(currentMember.userId)
    );

  const accountIds = cachedRows.flatMap((row) =>
    row.accountId ? [row.accountId] : []
  );
  const now = new Date();

  await ensureLuoguRankStatsRefreshRequests(db, cachedRows, now);

  const refreshActivity = await getLuoguRankRefreshActivity(db, accountIds);

  return cachedRows.map((row) => ({
    grade: row.grade,
    luogu: {
      acceptedProblemCount: row.acceptedProblemCount,
      acceptedWeightedScore: row.acceptedWeightedScore,
      averageAcceptedDifficulty: row.averageAcceptedDifficulty,
      fetchedAt: toIsoString(row.fetchedAt),
      handle: row.handle,
      profileUrl: row.profileUrl,
      syncStatus: getRefreshSyncStatus(
        refreshActivity.toStatusInput({
          accountId: row.accountId,
          fetchedAt: row.fetchedAt,
          lastError: row.lastError,
        })
      ),
    },
    major: row.major,
    realName: row.realName,
    userId: row.userId,
    username: row.username,
  }));
};
