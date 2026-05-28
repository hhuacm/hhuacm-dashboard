import type { Database } from "@hhuacm-dashboard/db";
import {
  getAtcoderAccountStatsRefreshActivity,
  getCodeforcesAccountStatsRefreshActivity,
  getLuoguAccountStatsRefreshActivity,
  getNowcoderAccountStatsRefreshActivity,
  getUserAwardsFromLuoguRefreshActivity,
} from "./activity";
import { atcoderAccountStatsJob } from "./jobs/atcoder-account-stats";
import { codeforcesAccountStatsJob } from "./jobs/codeforces-account-stats";
import { luoguAccountStatsJob } from "./jobs/luogu-account-stats";
import { nowcoderAccountStatsJob } from "./jobs/nowcoder-account-stats";
import { userAwardsFromLuoguJob } from "./jobs/user-awards-from-luogu";
import {
  isAtcoderStatsCacheFresh,
  isCodeforcesStatsCacheFresh,
  isLuoguStatsCacheFresh,
  isNowcoderStatsCacheFresh,
  isUserAwardsCacheFresh,
} from "./policy";

type FreshPolicy = (fetchedAt: Date | null, now: Date) => boolean;

interface RefreshRequestState {
  isQueued: boolean;
  requestedAt: Date | null;
}

interface RefreshActivity {
  isRefreshing: boolean;
  requestedAt: Date | null;
}

const toRequestState = (input: {
  isRefreshing: boolean;
  requestedAt: Date | null;
}): RefreshRequestState => ({
  isQueued: input.isRefreshing,
  requestedAt: input.requestedAt,
});

export const enqueueRefreshIfDue = async (input: {
  fetchedAt: Date | null;
  isFresh: FreshPolicy;
  now: Date;
  requestRefresh: () => Promise<void>;
}) => {
  if (!input.isFresh(input.fetchedAt, input.now)) {
    await input.requestRefresh();
  }
};

const ensureRefreshRequest = async (input: {
  canRefresh?: boolean;
  fetchedAt: Date | null;
  getActivity: (targetId: string) => Promise<RefreshActivity>;
  isFresh: FreshPolicy;
  now: Date;
  requestRefresh: (targetId: string) => Promise<void>;
  targetId: null | string;
}) => {
  const targetId = input.targetId;

  if (!(input.canRefresh ?? true) || targetId === null) {
    return toRequestState({
      isRefreshing: false,
      requestedAt: null,
    });
  }

  await enqueueRefreshIfDue({
    fetchedAt: input.fetchedAt,
    isFresh: input.isFresh,
    now: input.now,
    requestRefresh: async () => await input.requestRefresh(targetId),
  });

  const activity = await input.getActivity(targetId);

  return toRequestState({
    isRefreshing: activity.isRefreshing,
    requestedAt: activity.requestedAt,
  });
};

export const ensureCodeforcesAccountStatsRefresh = async (
  db: Database,
  input: {
    accountId: string;
    fetchedAt: Date | null;
    now: Date;
  }
) =>
  ensureRefreshRequest({
    fetchedAt: input.fetchedAt,
    getActivity: async (accountId) =>
      await getCodeforcesAccountStatsRefreshActivity(db, accountId),
    isFresh: isCodeforcesStatsCacheFresh,
    now: input.now,
    requestRefresh: async (accountId) => {
      await codeforcesAccountStatsJob.enqueue(db, accountId);
    },
    targetId: input.accountId,
  });

export const ensureAtcoderAccountStatsRefresh = async (
  db: Database,
  input: {
    accountId: string;
    fetchedAt: Date | null;
    now: Date;
  }
) =>
  ensureRefreshRequest({
    fetchedAt: input.fetchedAt,
    getActivity: async (accountId) =>
      await getAtcoderAccountStatsRefreshActivity(db, accountId),
    isFresh: isAtcoderStatsCacheFresh,
    now: input.now,
    requestRefresh: async (accountId) => {
      await atcoderAccountStatsJob.enqueue(db, accountId);
    },
    targetId: input.accountId,
  });

export const ensureLuoguAccountStatsRefresh = async (
  db: Database,
  input: {
    accountId: string;
    fetchedAt: Date | null;
    now: Date;
  }
) =>
  ensureRefreshRequest({
    fetchedAt: input.fetchedAt,
    getActivity: async (accountId) =>
      await getLuoguAccountStatsRefreshActivity(db, accountId),
    isFresh: isLuoguStatsCacheFresh,
    now: input.now,
    requestRefresh: async (accountId) => {
      await luoguAccountStatsJob.enqueue(db, accountId);
    },
    targetId: input.accountId,
  });

export const ensureNowcoderAccountStatsRefresh = async (
  db: Database,
  input: {
    accountId: string;
    fetchedAt: Date | null;
    now: Date;
  }
) =>
  ensureRefreshRequest({
    fetchedAt: input.fetchedAt,
    getActivity: async (accountId) =>
      await getNowcoderAccountStatsRefreshActivity(db, accountId),
    isFresh: isNowcoderStatsCacheFresh,
    now: input.now,
    requestRefresh: async (accountId) => {
      await nowcoderAccountStatsJob.enqueue(db, accountId);
    },
    targetId: input.accountId,
  });

export const ensureUserAwardsFromLuoguRefresh = async (
  db: Database,
  input: {
    accountId: null | string;
    canRefresh: boolean;
    fetchedAt: Date | null;
    now: Date;
  }
) =>
  ensureRefreshRequest({
    canRefresh: input.canRefresh,
    fetchedAt: input.fetchedAt,
    getActivity: async (accountId) =>
      await getUserAwardsFromLuoguRefreshActivity(db, accountId),
    isFresh: isUserAwardsCacheFresh,
    now: input.now,
    requestRefresh: async (accountId) => {
      await userAwardsFromLuoguJob.enqueue(db, accountId);
    },
    targetId: input.accountId,
  });
