import { codeforcesAccountStats } from "@hhuacm-dashboard/db/schema/codeforces-account-stats";
import { currentMember } from "@hhuacm-dashboard/db/schema/current-member";
import { userOjAccount } from "@hhuacm-dashboard/db/schema/oj-account";
import { asc, eq, sql } from "drizzle-orm";

import type { Context } from "../../context";
import { getCodeforcesRankRefreshActivity } from "../refresh/activity";

type Database = Context["db"];

type CodeforcesRankStatus =
  | "empty"
  | "failed"
  | "missing-account"
  | "ready"
  | "refreshing"
  | "stale";

const userNameLabelSortExpression = sql<string>`coalesce(nullif(trim(${currentMember.realName}), ''), nullif(trim(${currentMember.username}), ''), '')`;

const toIsoString = (date: Date | null) => date?.toISOString() ?? null;

export const getCodeforcesRankStatus = (input: {
  fetchedAt: Date | null;
  hasActiveRefreshRequest: boolean;
  isFresh: boolean;
  lastError: null | string;
  statsHandle: null | string;
}): CodeforcesRankStatus => {
  if (input.hasActiveRefreshRequest) {
    return "refreshing";
  }

  if (!input.statsHandle) {
    return "empty";
  }

  if (input.lastError) {
    return "failed";
  }

  if (!input.fetchedAt) {
    return "empty";
  }

  if (!input.isFresh) {
    return "stale";
  }

  return "ready";
};

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
      statsHandle: codeforcesAccountStats.handle,
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
  const refreshActivity = await getCodeforcesRankRefreshActivity(
    db,
    accountIds,
    now
  );

  return rows.map((row) => ({
    codeforces: {
      acceptedProblemCount: row.acceptedProblemCount,
      acceptedProblemCountInMonth: row.acceptedProblemCountInMonth,
      accountId: row.accountId,
      fetchedAt: toIsoString(row.fetchedAt),
      handle: row.handle,
      lastError: row.lastError,
      lastOnlineAt: toIsoString(row.lastOnlineAt),
      maxRating: row.maxRating,
      profileUrl: row.profileUrl,
      rating: row.rating,
      status: getCodeforcesRankStatus(
        refreshActivity.toStatusInput({
          accountId: row.accountId,
          fetchedAt: row.fetchedAt,
          lastError: row.lastError,
          statsHandle: row.statsHandle,
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
