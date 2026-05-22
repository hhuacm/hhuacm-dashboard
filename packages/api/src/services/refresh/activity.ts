import { refreshRequest } from "@hhuacm-dashboard/db/schema/refresh-request";
import { and, asc, eq, inArray } from "drizzle-orm";

import type { Context } from "../../context";
import { isCodeforcesStatsCacheFresh, isLuoguStatsCacheFresh } from "./policy";
import {
  codeforcesAccountStatsRequestKind,
  luoguAccountStatsRequestKind,
  type RefreshRequestKind,
  userAwardsFromLuoguRequestKind,
} from "./request-types";

type Database = Context["db"];

interface RefreshActivityTarget {
  kind: RefreshRequestKind;
  targetId: string;
}

interface RefreshActivityTargetGroup {
  kind: RefreshRequestKind;
  targetIds: string[];
}

export interface RefreshActivity {
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
    kind: codeforcesAccountStatsRequestKind,
    targetId: accountId,
  });

export const getLuoguAccountStatsRefreshActivity = (
  db: Database,
  accountId: string
) =>
  getRefreshActivityForTarget(db, {
    kind: luoguAccountStatsRequestKind,
    targetId: accountId,
  });

export const getUserAwardsFromLuoguRefreshActivity = (
  db: Database,
  accountId: string
) =>
  getRefreshActivityForTarget(db, {
    kind: userAwardsFromLuoguRequestKind,
    targetId: accountId,
  });

const getRefreshingCodeforcesAccountIds = (
  db: Database,
  accountIds: string[]
) =>
  getRefreshingTargetIds(db, {
    kind: codeforcesAccountStatsRequestKind,
    targetIds: accountIds,
  });

const getRefreshingLuoguAccountIds = (db: Database, accountIds: string[]) =>
  getRefreshingTargetIds(db, {
    kind: luoguAccountStatsRequestKind,
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
      hasActiveRefreshRequest: refreshingAccountIds.has(input.accountId),
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
      hasActiveRefreshRequest: refreshingAccountIds.has(input.accountId),
      isFresh: isLuoguStatsCacheFresh(input.fetchedAt, now),
      lastError: input.lastError,
    }),
  };
};
