import type { Database } from "@hhuacm-dashboard/db";
import { currentMember } from "@hhuacm-dashboard/db/schema/current-member";
import { luoguAccountStats } from "@hhuacm-dashboard/db/schema/luogu-account-stats";
import { userOjAccount } from "@hhuacm-dashboard/db/schema/oj-account";
import { desc, eq } from "drizzle-orm";
import { ensureAccountStatsRefreshes } from "../../refresh/account-stats";
import { rankUserNameOrder, toIsoString } from "./shared";

export const listLuoguRankRows = async (db: Database) => {
  const cachedRows = await db
    .select({
      acceptedProblemCount: luoguAccountStats.acceptedProblemCount,
      acceptedWeightedScore: luoguAccountStats.acceptedWeightedScore,
      accountId: userOjAccount.id,
      averageAcceptedDifficulty: luoguAccountStats.averageAcceptedDifficulty,
      externalId: userOjAccount.externalId,
      fetchedAt: luoguAccountStats.fetchedAt,
      grade: currentMember.grade,
      handle: userOjAccount.handle,
      lastError: luoguAccountStats.lastError,
      major: currentMember.major,
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
      ...rankUserNameOrder
    );

  const refresh = await ensureAccountStatsRefreshes(db, {
    accounts: cachedRows,
    platform: "luogu",
  });

  return cachedRows.map((row) => ({
    grade: row.grade,
    luogu: {
      acceptedProblemCount: row.acceptedProblemCount,
      acceptedWeightedScore: row.acceptedWeightedScore,
      averageAcceptedDifficulty: row.averageAcceptedDifficulty,
      externalId: row.externalId,
      fetchedAt: toIsoString(row.fetchedAt),
      handle: row.handle,
      syncStatus: refresh.syncStatusOf(row),
    },
    major: row.major,
    realName: row.realName,
    userId: row.userId,
    username: row.username,
  }));
};
