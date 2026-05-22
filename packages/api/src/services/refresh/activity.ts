import { refreshJob } from "@hhuacm-dashboard/db/schema/refresh-job";
import { and, asc, eq, inArray } from "drizzle-orm";

import type { Context } from "../../context";
import {
  codeforcesAccountStatsJobKind,
  luoguAccountStatsJobKind,
  type RefreshJobKind,
  userAwardsFromLuoguJobKind,
} from "./job-types";
import { isCodeforcesStatsCacheFresh, isLuoguStatsCacheFresh } from "./policy";

type Database = Context["db"];

interface RefreshActivityTarget {
  kind: RefreshJobKind;
  targetId: string;
}

interface RefreshActivityTargetGroup {
  kind: RefreshJobKind;
  targetIds: string[];
}

export interface RefreshActivity {
  isRefreshing: boolean;
  requestedAt: Date | null;
}

const activeRefreshJobStatuses = ["pending", "running"] as const;

const getRefreshActivityForTarget = async (
  db: Database,
  target: RefreshActivityTarget
): Promise<RefreshActivity> => {
  const [job] = await db
    .select({ createdAt: refreshJob.createdAt })
    .from(refreshJob)
    .where(
      and(
        eq(refreshJob.kind, target.kind),
        eq(refreshJob.targetId, target.targetId),
        inArray(refreshJob.status, activeRefreshJobStatuses)
      )
    )
    .orderBy(asc(refreshJob.createdAt))
    .limit(1);

  return {
    isRefreshing: Boolean(job),
    requestedAt: job?.createdAt ?? null,
  };
};

const getRefreshingTargetIds = async (
  db: Database,
  target: RefreshActivityTargetGroup
) => {
  if (target.targetIds.length === 0) {
    return new Set<string>();
  }

  const jobs = await db
    .select({ targetId: refreshJob.targetId })
    .from(refreshJob)
    .where(
      and(
        eq(refreshJob.kind, target.kind),
        inArray(refreshJob.status, activeRefreshJobStatuses),
        inArray(refreshJob.targetId, target.targetIds)
      )
    );

  return new Set(jobs.map((job) => job.targetId));
};

export const getCodeforcesAccountStatsRefreshActivity = (
  db: Database,
  accountId: string
) =>
  getRefreshActivityForTarget(db, {
    kind: codeforcesAccountStatsJobKind,
    targetId: accountId,
  });

export const getLuoguAccountStatsRefreshActivity = (
  db: Database,
  accountId: string
) =>
  getRefreshActivityForTarget(db, {
    kind: luoguAccountStatsJobKind,
    targetId: accountId,
  });

export const getUserAwardsFromLuoguRefreshActivity = (
  db: Database,
  accountId: string
) =>
  getRefreshActivityForTarget(db, {
    kind: userAwardsFromLuoguJobKind,
    targetId: accountId,
  });

const getRefreshingCodeforcesAccountIds = (
  db: Database,
  accountIds: string[]
) =>
  getRefreshingTargetIds(db, {
    kind: codeforcesAccountStatsJobKind,
    targetIds: accountIds,
  });

const getRefreshingLuoguAccountIds = (db: Database, accountIds: string[]) =>
  getRefreshingTargetIds(db, {
    kind: luoguAccountStatsJobKind,
    targetIds: accountIds,
  });

export const getCodeforcesRankRefreshActivity = async (
  db: Database,
  accountIds: string[],
  now: Date
) => {
  const refreshingAccountIds = await getRefreshingCodeforcesAccountIds(
    db,
    accountIds
  );

  return {
    toStatusInput: (input: {
      accountId: string;
      fetchedAt: Date | null;
      lastError: null | string;
      statsHandle: null | string;
    }) => ({
      fetchedAt: input.fetchedAt,
      hasActiveRefreshJob: refreshingAccountIds.has(input.accountId),
      isFresh: isCodeforcesStatsCacheFresh(input.fetchedAt, now),
      lastError: input.lastError,
      statsHandle: input.statsHandle,
    }),
  };
};

export const getLuoguRankRefreshActivity = async (
  db: Database,
  accountIds: string[],
  now: Date
) => {
  const refreshingAccountIds = await getRefreshingLuoguAccountIds(
    db,
    accountIds
  );

  return {
    toStatusInput: (input: {
      accountId: string;
      fetchedAt: Date | null;
      lastError: null | string;
    }) => ({
      fetchedAt: input.fetchedAt,
      hasActiveRefreshJob: refreshingAccountIds.has(input.accountId),
      isFresh: isLuoguStatsCacheFresh(input.fetchedAt, now),
      lastError: input.lastError,
    }),
  };
};
