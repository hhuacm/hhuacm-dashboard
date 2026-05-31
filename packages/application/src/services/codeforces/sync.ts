import type { Database } from "@hhuacm-dashboard/db";
import { codeforcesAccountStats } from "@hhuacm-dashboard/db/schema/codeforces-account-stats";
import { userOjAccount } from "@hhuacm-dashboard/db/schema/oj-account";
import { eq } from "drizzle-orm";
import type {
  CodeforcesSubmissionResult,
  CodeforcesUserInfoResult,
} from "../../external/online-judge-sources/codeforces/api";
import { codeforcesSource } from "../../external/online-judge-sources/codeforces/api";
import { truncateRefreshError } from "../../refresh/policy";
import { summarizeAcceptedProblems } from "./summary";
import type { CodeforcesAccount } from "./types";

const oneMonthSeconds = 30 * 24 * 60 * 60;

interface CodeforcesStatsLoaders {
  loadUserInfo?: typeof codeforcesSource.userInfo;
  loadUserStatus?: typeof codeforcesSource.userStatus;
}

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
  externalId: string
) => {
  const [userInfo] = userInfoList;

  if (!userInfo) {
    throw new Error(`Codeforces user.info ${externalId} result is empty`);
  }

  return userInfo;
};

export const syncCodeforcesAccountStats = async (
  db: Database,
  account: CodeforcesAccount,
  now = new Date(),
  loaders: CodeforcesStatsLoaders = {}
) => {
  const loadUserInfo = loaders.loadUserInfo ?? codeforcesSource.userInfo;
  const loadUserStatus = loaders.loadUserStatus ?? codeforcesSource.userStatus;
  const userInfo = selectCodeforcesUserInfo(
    await loadUserInfo({
      handles: account.externalId,
    }),
    account.externalId
  );

  const submissions: CodeforcesSubmissionResult = await loadUserStatus({
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
    throw new Error(`Codeforces stats write failed for ${account.externalId}`);
  }

  if (account.handle !== userInfo.handle) {
    await db
      .update(userOjAccount)
      .set({ handle: userInfo.handle })
      .where(eq(userOjAccount.id, account.id));
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
      `Codeforces failure write failed for ${account.externalId}: ${lastError}`
    );
  }

  return stats;
};
