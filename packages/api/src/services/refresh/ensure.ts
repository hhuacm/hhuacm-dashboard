import type { Context } from "../../context";
import {
  getCodeforcesAccountStatsRefreshActivity,
  getLuoguAccountStatsRefreshActivity,
  getUserAwardsFromLuoguRefreshActivity,
} from "./activity";
import {
  isCodeforcesAccountStatsFresh,
  isLuoguStatsCacheFresh,
  isUserAwardsCacheFresh,
} from "./policy";
import {
  requestCodeforcesAccountStatsRefresh,
  requestLuoguAccountStatsRefresh,
  requestUserAwardsFromLuoguRefresh,
} from "./requests";

type Database = Context["db"];

export interface RefreshQueueState {
  isFresh: boolean;
  isQueued: boolean;
  requestedAt: Date | null;
}

const toQueueState = (input: {
  isFresh: boolean;
  isRefreshing: boolean;
  requestedAt: Date | null;
}): RefreshQueueState => ({
  isFresh: input.isFresh,
  isQueued: input.isRefreshing,
  requestedAt: input.requestedAt,
});

export const ensureCodeforcesAccountStatsRefresh = async (
  db: Database,
  input: {
    accountHandle: string;
    accountId: string;
    fetchedAt: Date | null;
    now: Date;
    statsHandle: null | string;
  }
) => {
  const isFresh = isCodeforcesAccountStatsFresh(input);

  if (!isFresh) {
    await requestCodeforcesAccountStatsRefresh(db, input.accountId);
  }

  const activity = await getCodeforcesAccountStatsRefreshActivity(
    db,
    input.accountId
  );

  return toQueueState({
    isFresh,
    isRefreshing: activity.isRefreshing,
    requestedAt: activity.requestedAt,
  });
};

export const ensureLuoguAccountStatsRefresh = async (
  db: Database,
  input: {
    accountId: string;
    fetchedAt: Date | null;
    now: Date;
  }
) => {
  const isFresh = isLuoguStatsCacheFresh(input.fetchedAt, input.now);

  if (!isFresh) {
    await requestLuoguAccountStatsRefresh(db, input.accountId);
  }

  const activity = await getLuoguAccountStatsRefreshActivity(
    db,
    input.accountId
  );

  return toQueueState({
    isFresh,
    isRefreshing: activity.isRefreshing,
    requestedAt: activity.requestedAt,
  });
};

export const ensureUserAwardsFromLuoguRefresh = async (
  db: Database,
  input: {
    accountId: null | string;
    canRefresh: boolean;
    fetchedAt: Date | null;
    now: Date;
  }
) => {
  const isFresh = isUserAwardsCacheFresh(input.fetchedAt, input.now);
  const accountId = input.accountId;
  const shouldRequestRefresh =
    input.canRefresh && accountId !== null && !isFresh;

  if (shouldRequestRefresh) {
    await requestUserAwardsFromLuoguRefresh(db, accountId);
  }

  const activity =
    input.canRefresh && accountId !== null
      ? await getUserAwardsFromLuoguRefreshActivity(db, accountId)
      : null;

  return toQueueState({
    isFresh,
    isRefreshing: activity?.isRefreshing ?? false,
    requestedAt: activity?.requestedAt ?? null,
  });
};
