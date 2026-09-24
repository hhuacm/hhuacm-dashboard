import type { Database, DatabaseTransaction } from "@hhuacm-dashboard/db";
import { nowcoderAccountStats } from "@hhuacm-dashboard/db/schema/nowcoder-account-stats";
import { userOjAccount } from "@hhuacm-dashboard/db/schema/oj-account";
import { eq } from "drizzle-orm";
import { nowcoderSource } from "../../external/online-judge-sources/nowcoder/api";
import { truncateRefreshError } from "../../refresh/policy";
import { commitOjAccountRefresh } from "../oj-account/commit-refresh";
import type { OjAccountIdentity } from "../oj-account/queries";

type NowcoderRatingBasicLoader = typeof nowcoderSource.ratingBasic;
type NowcoderAcceptedCountLoader =
  typeof nowcoderSource.acceptedPracticeProblemCount;

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Unknown Nowcoder sync error";

const parseNowcoderExternalId = (externalId: string) => {
  const uid = Number(externalId);

  return Number.isSafeInteger(uid) && uid > 0 ? uid : null;
};

export const syncNowcoderAccountStats = async (
  db: Database,
  account: OjAccountIdentity,
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
  const [acceptedProblemCount, ratingBasic] = await Promise.all([
    loadAcceptedPracticeProblemCount({ uid }),
    loadRatingBasic({ uid }),
  ]);
  const fetchedAt = now;

  await commitOjAccountRefresh(db, account, async (tx) => {
    await tx
      .insert(nowcoderAccountStats)
      .values({
        acceptedProblemCount,
        accountId: account.id,
        fetchedAt,
        lastError: null,
        rating: ratingBasic.rating,
      })
      .onConflictDoUpdate({
        set: {
          acceptedProblemCount,
          fetchedAt,
          lastError: null,
          rating: ratingBasic.rating,
        },
        target: nowcoderAccountStats.accountId,
      });

    if (account.handle !== ratingBasic.nickname) {
      await tx
        .update(userOjAccount)
        .set({ handle: ratingBasic.nickname })
        .where(eq(userOjAccount.id, account.id));
    }
  });
};

export const markNowcoderAccountStatsRefreshFailed = async (
  db: Database,
  account: OjAccountIdentity,
  error: unknown
) => {
  const lastError = truncateRefreshError(getErrorMessage(error));

  await commitOjAccountRefresh(db, account, async (tx) => {
    await tx
      .insert(nowcoderAccountStats)
      .values({
        accountId: account.id,
        lastError,
      })
      .onConflictDoUpdate({
        set: {
          lastError,
        },
        target: nowcoderAccountStats.accountId,
      });
  });
};

export const deleteNowcoderStats = async (
  db: Database | DatabaseTransaction,
  accountId: string
) => {
  await db
    .delete(nowcoderAccountStats)
    .where(eq(nowcoderAccountStats.accountId, accountId));
};
