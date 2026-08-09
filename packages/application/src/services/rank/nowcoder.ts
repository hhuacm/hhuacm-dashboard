import type { Database } from "@hhuacm-dashboard/db";
import { currentMember } from "@hhuacm-dashboard/db/schema/current-member";
import { nowcoderAccountStats } from "@hhuacm-dashboard/db/schema/nowcoder-account-stats";
import { userOjAccount } from "@hhuacm-dashboard/db/schema/oj-account";
import { desc, eq } from "drizzle-orm";
import { ensureAccountStatsRefreshes } from "../../refresh/account-stats";
import { rankUserNameOrder, toIsoString } from "./shared";

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

  const refresh = await ensureAccountStatsRefreshes(db, {
    accounts: cachedRows,
    platform: "nowcoder",
  });

  return cachedRows.map((row) => ({
    grade: row.grade,
    major: row.major,
    nowcoder: {
      acceptedProblemCount: row.acceptedProblemCount,
      externalId: row.externalId,
      fetchedAt: toIsoString(row.fetchedAt),
      handle: row.handle,
      rating: row.rating,
      syncStatus: refresh.syncStatusOf(row),
    },
    realName: row.realName,
    userId: row.userId,
    username: row.username,
  }));
};
