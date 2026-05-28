import type { Database } from "@hhuacm-dashboard/db";
import { codeforcesAccountStats } from "@hhuacm-dashboard/db/schema/codeforces-account-stats";
import { currentMember } from "@hhuacm-dashboard/db/schema/current-member";
import { userOjAccount } from "@hhuacm-dashboard/db/schema/oj-account";
import { asc, eq, sql } from "drizzle-orm";
import { getCodeforcesRankRefreshActivity } from "../../refresh/activity";
import { enqueueRefreshIfDue } from "../../refresh/ensure";
import { codeforcesAccountStatsJob } from "../../refresh/jobs/codeforces-account-stats";
import { isCodeforcesStatsCacheFresh } from "../../refresh/policy";
import { getRefreshSyncStatus } from "../../refresh/sync-status";

const userNameLabelSortExpression = sql<string>`coalesce(nullif(trim(${currentMember.realName}), ''), nullif(trim(${currentMember.username}), ''), '')`;

const toIsoString = (date: Date | null) => date?.toISOString() ?? null;

const ensureCodeforcesRankStatsRefreshRequests = async (
  db: Database,
  rows: { accountId: string; fetchedAt: Date | null }[],
  now: Date
) => {
  for (const row of rows) {
    await enqueueRefreshIfDue({
      fetchedAt: row.fetchedAt,
      isFresh: isCodeforcesStatsCacheFresh,
      now,
      requestRefresh: async () => {
        await codeforcesAccountStatsJob.enqueue(db, row.accountId);
      },
    });
  }
};

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
    .orderBy(asc(userNameLabelSortExpression), asc(currentMember.userId));

  const accountIds = cachedRows.flatMap((row) =>
    row.accountId ? [row.accountId] : []
  );
  const now = new Date();

  await ensureCodeforcesRankStatsRefreshRequests(db, cachedRows, now);

  const refreshActivity = await getCodeforcesRankRefreshActivity(
    db,
    accountIds
  );

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
