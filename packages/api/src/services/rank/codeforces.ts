import { codeforcesAccountStats } from "@hhuacm-dashboard/db/schema/codeforces-account-stats";
import { currentMember } from "@hhuacm-dashboard/db/schema/current-member";
import { userOjAccount } from "@hhuacm-dashboard/db/schema/oj-account";
import { asc, eq, sql } from "drizzle-orm";

import type { Context } from "../../context";
import { getCodeforcesStatsSyncStatus } from "../codeforces/sync-status";
import { getCodeforcesRankRefreshActivity } from "../refresh/activity";
import { isCodeforcesStatsCacheFresh } from "../refresh/policy";
import { requestCodeforcesAccountStatsRefresh } from "../refresh/requests";

type Database = Context["db"];

const userNameLabelSortExpression = sql<string>`coalesce(nullif(trim(${currentMember.realName}), ''), nullif(trim(${currentMember.username}), ''), '')`;

const toIsoString = (date: Date | null) => date?.toISOString() ?? null;

export const listCodeforcesRankRows = async (db: Database) => {
  const rows = await db
    .select({
      acceptedProblemCount: codeforcesAccountStats.acceptedProblemCount,
      acceptedProblemCountInMonth:
        codeforcesAccountStats.acceptedProblemCountInMonth,
      accountId: userOjAccount.id,
      fetchedAt: codeforcesAccountStats.fetchedAt,
      grade: currentMember.grade,
      handle: userOjAccount.handle,
      lastError: codeforcesAccountStats.lastError,
      lastOnlineAt: codeforcesAccountStats.lastOnlineAt,
      major: currentMember.major,
      maxRating: codeforcesAccountStats.maxRating,
      profileUrl: userOjAccount.profileUrl,
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
    .orderBy(asc(userNameLabelSortExpression), asc(currentMember.userId));
  const accountIds = rows.flatMap((row) =>
    row.accountId ? [row.accountId] : []
  );
  const now = new Date();

  for (const row of rows) {
    if (!isCodeforcesStatsCacheFresh(row.fetchedAt, now)) {
      await requestCodeforcesAccountStatsRefresh(db, row.accountId);
    }
  }

  const refreshActivity = await getCodeforcesRankRefreshActivity(
    db,
    accountIds
  );

  return rows.map((row) => ({
    codeforces: {
      acceptedProblemCount: row.acceptedProblemCount,
      acceptedProblemCountInMonth: row.acceptedProblemCountInMonth,
      fetchedAt: toIsoString(row.fetchedAt),
      handle: row.handle,
      lastError: row.lastError,
      lastOnlineAt: toIsoString(row.lastOnlineAt),
      maxRating: row.maxRating,
      profileUrl: row.profileUrl,
      rating: row.rating,
      syncStatus: getCodeforcesStatsSyncStatus(
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
