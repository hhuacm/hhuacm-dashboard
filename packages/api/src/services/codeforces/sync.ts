import { codeforcesAccountStats } from "@hhuacm-dashboard/db/schema/codeforces-account-stats";

import type { Context } from "../../context";
import { refreshDefaults } from "../refresh/constants";
import { fetchCodeforcesSubmissions, fetchCodeforcesUserInfo } from "./api";
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
  handle: codeforcesAccountStats.handle,
  lastAttemptedAt: codeforcesAccountStats.lastAttemptedAt,
  lastError: codeforcesAccountStats.lastError,
  lastOnlineAt: codeforcesAccountStats.lastOnlineAt,
  maxRating: codeforcesAccountStats.maxRating,
  rating: codeforcesAccountStats.rating,
} as const;

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Unknown Codeforces sync error";

const truncateError = (message: string) =>
  message.slice(0, refreshDefaults.maxErrorLength);

export const syncCodeforcesAccountStats = async (
  db: Database,
  account: CodeforcesAccount,
  now = new Date()
) => {
  const userInfo = await fetchCodeforcesUserInfo(account.handle);
  const submissions = await fetchCodeforcesSubmissions(userInfo.handle);
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
      handle: userInfo.handle,
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
        handle: userInfo.handle,
        lastAttemptedAt: fetchedAt,
        lastError: null,
        lastOnlineAt,
        maxRating: userInfo.maxRating ?? null,
        rating: userInfo.rating ?? null,
        updatedAt: fetchedAt,
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
  const lastError = truncateError(getErrorMessage(error));

  const [stats] = await db
    .insert(codeforcesAccountStats)
    .values({
      accountId: account.id,
      handle: account.handle,
      lastAttemptedAt: now,
      lastError,
    })
    .onConflictDoUpdate({
      set: {
        handle: account.handle,
        lastAttemptedAt: now,
        lastError,
        updatedAt: now,
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
