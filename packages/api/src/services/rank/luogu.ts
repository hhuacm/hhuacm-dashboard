import { currentMember } from "@hhuacm-dashboard/db/schema/current-member";
import { luoguAccountStats } from "@hhuacm-dashboard/db/schema/luogu-account-stats";
import { userOjAccount } from "@hhuacm-dashboard/db/schema/oj-account";
import { asc, desc, eq, sql } from "drizzle-orm";

import type { Context } from "../../context";
import { getLuoguRankRefreshActivity } from "../refresh/activity";

type Database = Context["db"];

type LuoguRankStatus =
  | "empty"
  | "failed"
  | "missing-account"
  | "ready"
  | "refreshing"
  | "stale";

const userNameLabelSortExpression = sql<string>`coalesce(nullif(trim(${currentMember.realName}), ''), nullif(trim(${currentMember.username}), ''), '')`;

const toIsoString = (date: Date | null) => date?.toISOString() ?? null;

const getLuoguRankStatus = (input: {
  fetchedAt: Date | null;
  hasActiveRefreshRequest: boolean;
  isFresh: boolean;
  lastError: null | string;
}): LuoguRankStatus => {
  if (input.hasActiveRefreshRequest) {
    return "refreshing";
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

export const listLuoguRankRows = async (db: Database) => {
  const rows = await db
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
  const accountIds = rows.flatMap((row) =>
    row.accountId ? [row.accountId] : []
  );
  const now = new Date();
  const refreshActivity = await getLuoguRankRefreshActivity(
    db,
    accountIds,
    now
  );

  return rows.map((row) => ({
    grade: row.grade,
    luogu: {
      acceptedProblemCount: row.acceptedProblemCount,
      acceptedWeightedScore: row.acceptedWeightedScore,
      averageAcceptedDifficulty: row.averageAcceptedDifficulty,
      fetchedAt: toIsoString(row.fetchedAt),
      handle: row.handle,
      lastError: row.lastError,
      profileUrl: row.profileUrl,
      status: getLuoguRankStatus(
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
