import type { Database } from "@hhuacm-dashboard/db";
import { refreshRequest } from "@hhuacm-dashboard/db/schema/refresh-request";
import { and, asc, eq, inArray } from "drizzle-orm";
import { atcoderAccountStatsJob } from "./jobs/atcoder-account-stats";
import { codeforcesAccountStatsJob } from "./jobs/codeforces-account-stats";
import type { RefreshJobDefinition } from "./jobs/definition";
import { luoguAccountStatsJob } from "./jobs/luogu-account-stats";
import { nowcoderAccountStatsJob } from "./jobs/nowcoder-account-stats";
import { userAwardsFromLuoguJob } from "./jobs/user-awards-from-luogu";
import type { RefreshRequestKind } from "./request-store";

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

interface RankRefreshStatusInput {
  accountId: string;
  fetchedAt: Date | null;
  lastError: null | string;
}

type RefreshJobGetter = () => RefreshJobDefinition;

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

export const getRefreshActivityForJob = (
  db: Database,
  job: RefreshJobDefinition,
  targetId: string
) =>
  getRefreshActivityForTarget(db, {
    kind: job.kind,
    targetId,
  });

const createAccountRefreshActivityGetter =
  (getJob: RefreshJobGetter) => (db: Database, accountId: string) =>
    getRefreshActivityForJob(db, getJob(), accountId);

const createRankRefreshActivityGetter =
  (getJob: RefreshJobGetter) => async (db: Database, accountIds: string[]) => {
    const refreshingAccountIds = await getRefreshingTargetIds(db, {
      kind: getJob().kind,
      targetIds: accountIds,
    });

    return {
      toStatusInput: (input: RankRefreshStatusInput) => ({
        fetchedAt: input.fetchedAt,
        isQueued: refreshingAccountIds.has(input.accountId),
        lastError: input.lastError,
      }),
    };
  };

export const getCodeforcesAccountStatsRefreshActivity =
  createAccountRefreshActivityGetter(() => codeforcesAccountStatsJob);

export const getAtcoderAccountStatsRefreshActivity =
  createAccountRefreshActivityGetter(() => atcoderAccountStatsJob);

export const getLuoguAccountStatsRefreshActivity =
  createAccountRefreshActivityGetter(() => luoguAccountStatsJob);

export const getNowcoderAccountStatsRefreshActivity =
  createAccountRefreshActivityGetter(() => nowcoderAccountStatsJob);

export const getUserAwardsFromLuoguRefreshActivity =
  createAccountRefreshActivityGetter(() => userAwardsFromLuoguJob);

export const getCodeforcesRankRefreshActivity = createRankRefreshActivityGetter(
  () => codeforcesAccountStatsJob
);

export const getAtcoderRankRefreshActivity = createRankRefreshActivityGetter(
  () => atcoderAccountStatsJob
);

export const getLuoguRankRefreshActivity = createRankRefreshActivityGetter(
  () => luoguAccountStatsJob
);

export const getNowcoderRankRefreshActivity = createRankRefreshActivityGetter(
  () => nowcoderAccountStatsJob
);
