import { user } from "@hhuacm-dashboard/db/schema/auth";
import { codeforcesAccountStats } from "@hhuacm-dashboard/db/schema/codeforces-account-stats";
import { userOjAccount } from "@hhuacm-dashboard/db/schema/oj-account";
import { userProfile } from "@hhuacm-dashboard/db/schema/profile";
import {
  defaultMemberStatus,
  type MemberStatus,
} from "@hhuacm-dashboard/domain";
import { and, asc, eq, inArray, sql } from "drizzle-orm";

import type { Context } from "../../context";
import { publicActivityMemberStatuses } from "../member-status";
import { getCodeforcesRankRefreshActivity } from "../refresh/activity";

type Database = Context["db"];

export type CodeforcesRankStatus =
  | "empty"
  | "failed"
  | "missing-account"
  | "ready"
  | "refreshing"
  | "stale";

const userNameLabelSortExpression = sql<string>`coalesce(nullif(trim(${userProfile.realName}), ''), nullif(trim(${user.username}), ''), '')`;
const memberStatusExpression = sql<MemberStatus>`coalesce(${userProfile.memberStatus}, ${defaultMemberStatus})`;

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
      grade: userProfile.grade,
      handle: userOjAccount.handle,
      lastError: codeforcesAccountStats.lastError,
      lastOnlineAt: codeforcesAccountStats.lastOnlineAt,
      major: userProfile.major,
      maxRating: codeforcesAccountStats.maxRating,
      profileUrl: userOjAccount.profileUrl,
      rating: codeforcesAccountStats.rating,
      realName: userProfile.realName,
      statsHandle: codeforcesAccountStats.handle,
      userId: user.id,
      username: user.username,
    })
    .from(userOjAccount)
    .innerJoin(user, eq(user.id, userOjAccount.userId))
    .leftJoin(userProfile, eq(userProfile.userId, user.id))
    .leftJoin(
      codeforcesAccountStats,
      eq(codeforcesAccountStats.accountId, userOjAccount.id)
    )
    .where(
      and(
        eq(userOjAccount.platform, "codeforces"),
        inArray(memberStatusExpression, publicActivityMemberStatuses)
      )
    )
    .orderBy(asc(userNameLabelSortExpression), asc(user.id));
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
