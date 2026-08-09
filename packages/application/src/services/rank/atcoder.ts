import type { Database } from "@hhuacm-dashboard/db";
import { atcoderAccountStats } from "@hhuacm-dashboard/db/schema/atcoder-account-stats";
import { currentMember } from "@hhuacm-dashboard/db/schema/current-member";
import { userOjAccount } from "@hhuacm-dashboard/db/schema/oj-account";
import { desc, eq } from "drizzle-orm";
import { ensureAccountStatsRefreshes } from "../../refresh/account-stats";
import { rankUserNameOrder, toIsoString } from "./shared";

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

  const refresh = await ensureAccountStatsRefreshes(db, {
    accounts: cachedRows,
    platform: "atcoder",
  });

  return cachedRows.map((row) => ({
    atcoder: {
      externalId: row.externalId,
      fetchedAt: toIsoString(row.fetchedAt),
      handle: row.handle,
      rating: row.rating,
      recentPerformanceAverage: row.recentPerformanceAverage,
      syncStatus: refresh.syncStatusOf(row),
    },
    grade: row.grade,
    major: row.major,
    realName: row.realName,
    userId: row.userId,
    username: row.username,
  }));
};
