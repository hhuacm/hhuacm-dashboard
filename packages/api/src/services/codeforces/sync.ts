import { codeforcesAccountStats } from "@hhuacm-dashboard/db/schema/codeforces-account-stats";

import type { Context } from "../../context";
import type { CodeforcesUserInfoResult } from "../../external/online-judge-sources/codeforces/api";
import { codeforcesSource } from "../../external/online-judge-sources/codeforces/api";
import { truncateRefreshError } from "../refresh/policy";
import { summarizeAcceptedProblems } from "./summary";
import type { CodeforcesAccount } from "./types";

const oneMonthSeconds = 30 * 24 * 60 * 60;

type Database = Context["db"];

const codeforcesStatsFields = {
  acceptedProblemCount: codeforcesAccountStats.acceptedProblemCount,
  acceptedProblemCountInMonth:
    codeforcesAccountStats.acceptedProblemCountInMonth,
  accountId: codeforcesAccountStats.accountId,
  fetchedAt: codeforcesAccountStats.fetchedAt,
  lastAttemptedAt: codeforcesAccountStats.lastAttemptedAt,
  lastError: codeforcesAccountStats.lastError,
  lastOnlineAt: codeforcesAccountStats.lastOnlineAt,
  maxRating: codeforcesAccountStats.maxRating,
  rating: codeforcesAccountStats.rating,
} as const;

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Unknown Codeforces sync error";

const selectCodeforcesUserInfo = (
  userInfoList: CodeforcesUserInfoResult,
  handle: string
) => {
  const [userInfo] = userInfoList;

  if (!userInfo) {
    throw new Error(`Codeforces user.info ${handle} result is empty`);
  }

  return userInfo;
};

export const syncCodeforcesAccountStats = async (
  db: Database,
  account: CodeforcesAccount,
  now = new Date()
) => {
  const userInfo = selectCodeforcesUserInfo(
    await codeforcesSource.userInfo({
      handles: account.handle,
    }),
    account.handle
  );

  const submissions = await codeforcesSource.userStatus({
    handle: userInfo.handle,
  });
  const nowSeconds = Math.floor(now.getTime() / 1000);
  const summary = summarizeAcceptedProblems(submissions, {
    acceptedSinceSeconds: nowSeconds - oneMonthSeconds,
  });
  const fetchedAt = new Date();
  const lastOnlineAt =
    userInfo.lastOnlineTimeSeconds === undefined
      ? null
      : new Date(userInfo.lastOnlineTimeSeconds * 1000);

  const [stats] = await db
    .insert(codeforcesAccountStats)
    .values({
      acceptedProblemCount: summary.acceptedProblemCount,
      acceptedProblemCountInMonth: summary.acceptedProblemCountSince,
      accountId: account.id,
      fetchedAt,
      lastAttemptedAt: fetchedAt,
      lastError: null,
      lastOnlineAt,
      maxRating: userInfo.maxRating ?? null,
      rating: userInfo.rating ?? null,
    })
    .onConflictDoUpdate({
      set: {
        acceptedProblemCount: summary.acceptedProblemCount,
        acceptedProblemCountInMonth: summary.acceptedProblemCountSince,
        fetchedAt,
        lastAttemptedAt: fetchedAt,
        lastError: null,
        lastOnlineAt,
        maxRating: userInfo.maxRating ?? null,
        rating: userInfo.rating ?? null,
      },
      target: codeforcesAccountStats.accountId,
    })
    .returning(codeforcesStatsFields);

  if (!stats) {
    throw new Error(`Codeforces stats write failed for ${account.handle}`);
  }

  return stats;
};

export const markCodeforcesAccountStatsRefreshFailed = async (
  db: Database,
  account: CodeforcesAccount,
  error: unknown,
  now = new Date()
) => {
  const lastError = truncateRefreshError(getErrorMessage(error));

  const [stats] = await db
    .insert(codeforcesAccountStats)
    .values({
      accountId: account.id,
      lastAttemptedAt: now,
      lastError,
    })
    .onConflictDoUpdate({
      set: {
        lastAttemptedAt: now,
        lastError,
      },
      target: codeforcesAccountStats.accountId,
    })
    .returning(codeforcesStatsFields);

  if (!stats) {
    throw new Error(
      `Codeforces failure write failed for ${account.handle}: ${lastError}`
    );
  }

  return stats;
};
