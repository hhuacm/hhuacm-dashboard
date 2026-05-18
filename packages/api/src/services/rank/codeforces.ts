import { user } from "@hhuacm-dashboard/db/schema/auth";
import { codeforcesAccountStats } from "@hhuacm-dashboard/db/schema/codeforces-account-stats";
import { userOjAccount } from "@hhuacm-dashboard/db/schema/oj-account";
import { userProfile } from "@hhuacm-dashboard/db/schema/profile";
import { refreshJob } from "@hhuacm-dashboard/db/schema/refresh-job";
import {
  defaultMemberStatus,
  type MemberStatus,
} from "@hhuacm-dashboard/domain";
import { and, asc, eq, inArray, sql } from "drizzle-orm";

import type { Context } from "../../context";
import { publicActivityMemberStatuses } from "../member-status";
import {
  codeforcesAccountStatsJobKind,
  ojAccountTargetType,
  refreshDefaults,
} from "../refresh/constants";

type Database = Context["db"];

export type CodeforcesRankStatus =
  | "empty"
  | "failed"
  | "missing-account"
  | "ready"
  | "refreshing"
  | "stale";

const usernameSortExpression = sql<string>`coalesce(${user.displayUsername}, ${user.username}, ${user.name}, '')`;
const memberStatusExpression = sql<MemberStatus>`coalesce(${userProfile.memberStatus}, ${defaultMemberStatus})`;

const toIsoString = (date: Date | null) => date?.toISOString() ?? null;

export const getCodeforcesRankStatus = (input: {
  fetchedAt: Date | null;
  hasActiveRefreshJob: boolean;
  lastError: null | string;
  now: Date;
  statsHandle: null | string;
}): CodeforcesRankStatus => {
  if (input.hasActiveRefreshJob) {
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

  const ageMs = input.now.getTime() - input.fetchedAt.getTime();

  if (ageMs >= refreshDefaults.codeforcesStatsTtlMs) {
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
      displayUsername: user.displayUsername,
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
    .orderBy(asc(usernameSortExpression), asc(user.id));
  const accountIds = rows.flatMap((row) =>
    row.accountId ? [row.accountId] : []
  );
  const activeRefreshJobs =
    accountIds.length > 0
      ? await db
          .select({ targetId: refreshJob.targetId })
          .from(refreshJob)
          .where(
            and(
              eq(refreshJob.kind, codeforcesAccountStatsJobKind),
              eq(refreshJob.targetType, ojAccountTargetType),
              inArray(refreshJob.targetId, accountIds)
            )
          )
      : [];
  const refreshingAccountIds = new Set(
    activeRefreshJobs.map((job) => job.targetId)
  );
  const now = new Date();

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
      status: getCodeforcesRankStatus({
        fetchedAt: row.fetchedAt,
        hasActiveRefreshJob: refreshingAccountIds.has(row.accountId),
        lastError: row.lastError,
        now,
        statsHandle: row.statsHandle,
      }),
    },
    displayName:
      row.displayUsername ?? row.username ?? row.realName ?? "未命名用户",
    grade: row.grade,
    major: row.major,
    realName: row.realName,
    userId: row.userId,
    username: row.username,
  }));
};
