import type { Database } from "@hhuacm-dashboard/db";
import { getRefreshActivityForJob } from "./activity";
import { atcoderAccountStatsJob } from "./jobs/atcoder-account-stats";
import { codeforcesAccountStatsJob } from "./jobs/codeforces-account-stats";
import type { RefreshJobDefinition } from "./jobs/definition";
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

interface EnsureRefreshJobInput {
  canRefresh?: boolean;
  fetchedAt: Date | null;
  now: Date;
  targetId: null | string;
}

interface EnsureRefreshJobOptions {
  isFresh: FreshPolicy;
  job: RefreshJobDefinition;
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

const ensureRefreshJob = async (
  db: Database,
  input: EnsureRefreshJobInput,
  options: EnsureRefreshJobOptions
) =>
  ensureRefreshRequest({
    canRefresh: input.canRefresh,
    fetchedAt: input.fetchedAt,
    getActivity: async (targetId) =>
      await getRefreshActivityForJob(db, options.job, targetId),
    isFresh: options.isFresh,
    now: input.now,
    requestRefresh: async (targetId) => {
      await options.job.enqueue(db, targetId);
    },
    targetId: input.targetId,
  });

const ensureAccountStatsRefresh = async (
  db: Database,
  input: {
    accountId: string;
    fetchedAt: Date | null;
    now: Date;
  },
  options: EnsureRefreshJobOptions
) =>
  ensureRefreshJob(
    db,
    {
      fetchedAt: input.fetchedAt,
      now: input.now,
      targetId: input.accountId,
    },
    options
  );

export const ensureCodeforcesAccountStatsRefresh = async (
  db: Database,
  input: {
    accountId: string;
    fetchedAt: Date | null;
    now: Date;
  }
) =>
  ensureAccountStatsRefresh(db, input, {
    isFresh: isCodeforcesStatsCacheFresh,
    job: codeforcesAccountStatsJob,
  });

export const ensureAtcoderAccountStatsRefresh = async (
  db: Database,
  input: {
    accountId: string;
    fetchedAt: Date | null;
    now: Date;
  }
) =>
  ensureAccountStatsRefresh(db, input, {
    isFresh: isAtcoderStatsCacheFresh,
    job: atcoderAccountStatsJob,
  });

export const ensureLuoguAccountStatsRefresh = async (
  db: Database,
  input: {
    accountId: string;
    fetchedAt: Date | null;
    now: Date;
  }
) =>
  ensureAccountStatsRefresh(db, input, {
    isFresh: isLuoguStatsCacheFresh,
    job: luoguAccountStatsJob,
  });

export const ensureNowcoderAccountStatsRefresh = async (
  db: Database,
  input: {
    accountId: string;
    fetchedAt: Date | null;
    now: Date;
  }
) =>
  ensureAccountStatsRefresh(db, input, {
    isFresh: isNowcoderStatsCacheFresh,
    job: nowcoderAccountStatsJob,
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
  ensureRefreshJob(
    db,
    {
      canRefresh: input.canRefresh,
      fetchedAt: input.fetchedAt,
      now: input.now,
      targetId: input.accountId,
    },
    {
      isFresh: isUserAwardsCacheFresh,
      job: userAwardsFromLuoguJob,
    }
  );
