import type { Database } from "@hhuacm-dashboard/db";
import { nowcoderAccountStats } from "@hhuacm-dashboard/db/schema/nowcoder-account-stats";
import { userOjAccount } from "@hhuacm-dashboard/db/schema/oj-account";
import { eq } from "drizzle-orm";
import { nowcoderSource } from "../../external/online-judge-sources/nowcoder/api";
import { truncateRefreshError } from "../../refresh/policy";
import type { NowcoderAccount } from "./types";

type NowcoderRatingBasicLoader = typeof nowcoderSource.ratingBasic;
type NowcoderAcceptedCountLoader =
  typeof nowcoderSource.acceptedPracticeProblemCount;

const nowcoderStatsFields = {
  acceptedProblemCount: nowcoderAccountStats.acceptedProblemCount,
  accountId: nowcoderAccountStats.accountId,
  fetchedAt: nowcoderAccountStats.fetchedAt,
  lastAttemptedAt: nowcoderAccountStats.lastAttemptedAt,
  lastError: nowcoderAccountStats.lastError,
  rating: nowcoderAccountStats.rating,
} as const;

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Unknown Nowcoder sync error";

const parseNowcoderExternalId = (externalId: string) => {
  const uid = Number(externalId);

  return Number.isSafeInteger(uid) && uid > 0 ? uid : null;
};

export const syncNowcoderAccountStats = async (
  db: Database,
  account: NowcoderAccount,
  now = new Date(),
  loaders: {
    loadAcceptedPracticeProblemCount?: NowcoderAcceptedCountLoader;
    loadRatingBasic?: NowcoderRatingBasicLoader;
  } = {}
) => {
  const uid = parseNowcoderExternalId(account.externalId);

  if (uid === null) {
    throw new Error("Nowcoder UID is missing");
  }

  const loadRatingBasic = loaders.loadRatingBasic ?? nowcoderSource.ratingBasic;
  const loadAcceptedPracticeProblemCount =
    loaders.loadAcceptedPracticeProblemCount ??
    nowcoderSource.acceptedPracticeProblemCount;
  const ratingBasic = await loadRatingBasic({ uid });
  const acceptedProblemCount = await loadAcceptedPracticeProblemCount({ uid })
    .then((count) => count)
    .catch(() => null);
  const fetchedAt = now;
  const acceptedProblemCountUpdate =
    acceptedProblemCount === null ? {} : { acceptedProblemCount };

  const [stats] = await db
    .insert(nowcoderAccountStats)
    .values({
      acceptedProblemCount,
      accountId: account.id,
      fetchedAt,
      lastAttemptedAt: fetchedAt,
      lastError: null,
      rating: ratingBasic.rating,
    })
    .onConflictDoUpdate({
      set: {
        ...acceptedProblemCountUpdate,
        fetchedAt,
        lastAttemptedAt: fetchedAt,
        lastError: null,
        rating: ratingBasic.rating,
      },
      target: nowcoderAccountStats.accountId,
    })
    .returning(nowcoderStatsFields);

  if (!stats) {
    throw new Error(`Nowcoder stats write failed for ${account.externalId}`);
  }

  if (account.handle !== ratingBasic.nickname) {
    await db
      .update(userOjAccount)
      .set({ handle: ratingBasic.nickname })
      .where(eq(userOjAccount.id, account.id));
  }

  return stats;
};

export const markNowcoderAccountStatsRefreshFailed = async (
  db: Database,
  account: NowcoderAccount,
  error: unknown,
  now = new Date()
) => {
  const lastError = truncateRefreshError(getErrorMessage(error));

  const [stats] = await db
    .insert(nowcoderAccountStats)
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
      target: nowcoderAccountStats.accountId,
    })
    .returning(nowcoderStatsFields);

  if (!stats) {
    throw new Error(`Nowcoder failure write failed for ${account.externalId}`);
  }

  return stats;
};

export const deleteNowcoderStats = async (db: Database, accountId: string) => {
  await db
    .delete(nowcoderAccountStats)
    .where(eq(nowcoderAccountStats.accountId, accountId));
};
