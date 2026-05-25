import { refreshRequest } from "@hhuacm-dashboard/db/schema/refresh-request";
import { and, asc, eq, inArray } from "drizzle-orm";

import type { Context } from "../../context";
import { codeforcesAccountStatsJob } from "./jobs/codeforces-account-stats";
import { luoguAccountStatsJob } from "./jobs/luogu-account-stats";
import { userAwardsFromLuoguJob } from "./jobs/user-awards-from-luogu";
import type { RefreshRequestKind } from "./request-store";

type Database = Context["db"];

interface RefreshActivityTarget {
  kind: RefreshRequestKind;
  targetId: string;
}

interface RefreshActivityTargetGroup {
  kind: RefreshRequestKind;
  targetIds: string[];
}

interface RefreshActivity {
  isRefreshing: boolean;
  requestedAt: Date | null;
}

const getRefreshActivityForTarget = async (
  db: Database,
  target: RefreshActivityTarget
): Promise<RefreshActivity> => {
  const [request] = await db
    .select({ createdAt: refreshRequest.createdAt })
    .from(refreshRequest)
    .where(
      and(
        eq(refreshRequest.kind, target.kind),
        eq(refreshRequest.targetId, target.targetId)
      )
    )
    .orderBy(asc(refreshRequest.createdAt))
    .limit(1);

  return {
    isRefreshing: Boolean(request),
    requestedAt: request?.createdAt ?? null,
  };
};

const getRefreshingTargetIds = async (
  db: Database,
  target: RefreshActivityTargetGroup
) => {
  if (target.targetIds.length === 0) {
    return new Set<string>();
  }

  const requests = await db
    .select({ targetId: refreshRequest.targetId })
    .from(refreshRequest)
    .where(
      and(
        eq(refreshRequest.kind, target.kind),
        inArray(refreshRequest.targetId, target.targetIds)
      )
    );

  return new Set(requests.map((request) => request.targetId));
};

export const getCodeforcesAccountStatsRefreshActivity = (
  db: Database,
  accountId: string
) =>
  getRefreshActivityForTarget(db, {
    kind: codeforcesAccountStatsJob.kind,
    targetId: accountId,
  });

export const getLuoguAccountStatsRefreshActivity = (
  db: Database,
  accountId: string
) =>
  getRefreshActivityForTarget(db, {
    kind: luoguAccountStatsJob.kind,
    targetId: accountId,
  });

export const getUserAwardsFromLuoguRefreshActivity = (
  db: Database,
  accountId: string
) =>
  getRefreshActivityForTarget(db, {
    kind: userAwardsFromLuoguJob.kind,
    targetId: accountId,
  });

const getRefreshingCodeforcesAccountIds = (
  db: Database,
  accountIds: string[]
) =>
  getRefreshingTargetIds(db, {
    kind: codeforcesAccountStatsJob.kind,
    targetIds: accountIds,
  });

const getRefreshingLuoguAccountIds = (db: Database, accountIds: string[]) =>
  getRefreshingTargetIds(db, {
    kind: luoguAccountStatsJob.kind,
    targetIds: accountIds,
  });

export const getCodeforcesRankRefreshActivity = async (
  db: Database,
  accountIds: string[]
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
    }) => ({
      fetchedAt: input.fetchedAt,
      isQueued: refreshingAccountIds.has(input.accountId),
      lastError: input.lastError,
    }),
  };
};

export const getLuoguRankRefreshActivity = async (
  db: Database,
  accountIds: string[]
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
      isQueued: refreshingAccountIds.has(input.accountId),
      lastError: input.lastError,
    }),
  };
};
