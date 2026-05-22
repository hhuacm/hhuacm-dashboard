import { user } from "@hhuacm-dashboard/db/schema/auth";
import { luoguAccountStats } from "@hhuacm-dashboard/db/schema/luogu-account-stats";
import { userOjAccount } from "@hhuacm-dashboard/db/schema/oj-account";
import { userProfile } from "@hhuacm-dashboard/db/schema/profile";
import {
  defaultMemberStatus,
  type MemberStatus,
} from "@hhuacm-dashboard/domain";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";

import type { Context } from "../../context";
import { publicActivityMemberStatuses } from "../member-status";
import { getLuoguRankRefreshActivity } from "../refresh/activity";

type Database = Context["db"];

export type LuoguRankStatus =
  | "empty"
  | "failed"
  | "missing-account"
  | "ready"
  | "refreshing"
  | "stale";

const userNameLabelSortExpression = sql<string>`coalesce(nullif(trim(${userProfile.realName}), ''), nullif(trim(${user.username}), ''), '')`;
const memberStatusExpression = sql<MemberStatus>`coalesce(${userProfile.memberStatus}, ${defaultMemberStatus})`;

const toIsoString = (date: Date | null) => date?.toISOString() ?? null;

export const getLuoguRankStatus = (input: {
  fetchedAt: Date | null;
  hasActiveRefreshJob: boolean;
  isFresh: boolean;
  lastError: null | string;
}): LuoguRankStatus => {
  if (input.hasActiveRefreshJob) {
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
      grade: userProfile.grade,
      handle: userOjAccount.handle,
      lastError: luoguAccountStats.lastError,
      major: userProfile.major,
      profileUrl: userOjAccount.profileUrl,
      realName: userProfile.realName,
      uid: luoguAccountStats.uid,
      userId: user.id,
      username: user.username,
    })
    .from(userOjAccount)
    .innerJoin(user, eq(user.id, userOjAccount.userId))
    .leftJoin(userProfile, eq(userProfile.userId, user.id))
    .leftJoin(
      luoguAccountStats,
      eq(luoguAccountStats.accountId, userOjAccount.id)
    )
    .where(
      and(
        eq(userOjAccount.platform, "luogu"),
        inArray(memberStatusExpression, publicActivityMemberStatuses)
      )
    )
    .orderBy(
      desc(luoguAccountStats.acceptedWeightedScore),
      desc(luoguAccountStats.acceptedProblemCount),
      desc(luoguAccountStats.averageAcceptedDifficulty),
      asc(userNameLabelSortExpression),
      asc(user.id)
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
      accountId: row.accountId,
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
      uid: row.uid,
    },
    major: row.major,
    realName: row.realName,
    userId: row.userId,
    username: row.username,
  }));
};
