import type { Database } from "@hhuacm-dashboard/db";
import { codeforcesAccountStats } from "@hhuacm-dashboard/db/schema/codeforces-account-stats";
import { currentMember } from "@hhuacm-dashboard/db/schema/current-member";
import { userOjAccount } from "@hhuacm-dashboard/db/schema/oj-account";
import { eq } from "drizzle-orm";
import { ensureAccountStatsRefreshes } from "../../refresh/account-stats";
import { rankUserNameOrder, toIsoString } from "./shared";

export const listCodeforcesRankRows = async (db: Database) => {
  const cachedRows = await db
    .select({
      acceptedProblemCount: codeforcesAccountStats.acceptedProblemCount,
      acceptedProblemCountInMonth:
        codeforcesAccountStats.acceptedProblemCountInMonth,
      accountId: userOjAccount.id,
      externalId: userOjAccount.externalId,
      fetchedAt: codeforcesAccountStats.fetchedAt,
      grade: currentMember.grade,
      handle: userOjAccount.handle,
      lastError: codeforcesAccountStats.lastError,
      lastOnlineAt: codeforcesAccountStats.lastOnlineAt,
      major: currentMember.major,
      maxRating: codeforcesAccountStats.maxRating,
      rating: codeforcesAccountStats.rating,
      realName: currentMember.realName,
      userId: currentMember.userId,
      username: currentMember.username,
    })
    .from(userOjAccount)
    .innerJoin(currentMember, eq(currentMember.userId, userOjAccount.userId))
    .leftJoin(
      codeforcesAccountStats,
      eq(codeforcesAccountStats.accountId, userOjAccount.id)
    )
    .where(eq(userOjAccount.platform, "codeforces"))
    .orderBy(...rankUserNameOrder);

  const refresh = await ensureAccountStatsRefreshes(db, {
    accounts: cachedRows,
    platform: "codeforces",
  });

  return cachedRows.map((row) => ({
    codeforces: {
      acceptedProblemCount: row.acceptedProblemCount,
      acceptedProblemCountInMonth: row.acceptedProblemCountInMonth,
      fetchedAt: toIsoString(row.fetchedAt),
      externalId: row.externalId,
      handle: row.handle,
      lastOnlineAt: toIsoString(row.lastOnlineAt),
      maxRating: row.maxRating,
      rating: row.rating,
      syncStatus: refresh.syncStatusOf(row),
    },
    grade: row.grade,
    major: row.major,
    realName: row.realName,
    userId: row.userId,
    username: row.username,
  }));
};
