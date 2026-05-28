import type { Database, DatabaseTransaction } from "@hhuacm-dashboard/db";
import {
  userAward,
  userAwardSync,
} from "@hhuacm-dashboard/db/schema/user-award";
import { and, asc, eq } from "drizzle-orm";
import type { LuoguUserPageData } from "../external/online-judge-sources/luogu/api";
import { luoguSource } from "../external/online-judge-sources/luogu/api";
import { ensureUserAwardsFromLuoguRefresh } from "../refresh/ensure";
import { truncateRefreshError } from "../refresh/policy";
import {
  getRefreshSyncStatus,
  type RefreshSyncStatus,
} from "../refresh/sync-status";
import type { LuoguAccount } from "./luogu/types";

type LuoguUserLoader = typeof luoguSource.user;

const userAwardSource = "luogu";

export interface PublicProfileAward {
  contest: string;
  event: null | string;
  level: string;
  source: typeof userAwardSource;
  year: number;
}

export interface PublicProfileAwards {
  fetchedAt: null | string;
  items: PublicProfileAward[];
  syncStatus: RefreshSyncStatus;
}

interface LuoguAwardAccount extends LuoguAccount {
  userId: string;
}

interface SelectedLuoguUserAward {
  contest: string;
  event: null | string;
  level: string;
  sortOrder: number;
  year: number;
}

const awardFields = {
  contest: userAward.contest,
  event: userAward.event,
  level: userAward.level,
  sortOrder: userAward.sortOrder,
  source: userAward.source,
  year: userAward.year,
} as const;

const awardSyncFields = {
  fetchedAt: userAwardSync.fetchedAt,
  lastAttemptedAt: userAwardSync.lastAttemptedAt,
  lastError: userAwardSync.lastError,
  source: userAwardSync.source,
  userId: userAwardSync.userId,
} as const;

const toIsoString = (date: Date | null) => date?.toISOString() ?? null;

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Unknown user award sync error";

const parseLuoguExternalId = (externalId: string) => {
  const uid = Number(externalId);

  return Number.isSafeInteger(uid) && uid > 0 ? uid : null;
};

export const selectLuoguUserAwards = (
  userPage: LuoguUserPageData
): SelectedLuoguUserAward[] =>
  userPage.prizes.map((item, index) => ({
    contest: item.prize.contest,
    event: item.prize.event,
    level: item.prize.prize,
    sortOrder: index,
    year: item.prize.year,
  }));

const replaceLuoguUserAwards = async (
  tx: DatabaseTransaction,
  account: LuoguAwardAccount,
  awards: SelectedLuoguUserAward[]
) => {
  await tx
    .delete(userAward)
    .where(
      and(
        eq(userAward.userId, account.userId),
        eq(userAward.source, userAwardSource)
      )
    );

  if (awards.length === 0) {
    return;
  }

  const values: (typeof userAward.$inferInsert)[] = awards.map((award) => ({
    contest: award.contest,
    event: award.event,
    level: award.level,
    sortOrder: award.sortOrder,
    source: userAwardSource,
    userId: account.userId,
    year: award.year,
  }));

  await tx.insert(userAward).values(values);
};

export const syncUserAwardsFromLuogu = async (
  db: Database,
  account: LuoguAwardAccount,
  now = new Date(),
  loadUser: LuoguUserLoader = luoguSource.user
) => {
  const uid = parseLuoguExternalId(account.externalId);

  if (uid === null) {
    throw new Error("Luogu UID is missing");
  }

  const awards = selectLuoguUserAwards(await loadUser({ uid }));
  const fetchedAt = now;

  return await db.transaction(async (tx) => {
    await replaceLuoguUserAwards(tx, account, awards);

    const [sync] = await tx
      .insert(userAwardSync)
      .values({
        fetchedAt,
        lastAttemptedAt: fetchedAt,
        lastError: null,
        source: userAwardSource,
        userId: account.userId,
      })
      .onConflictDoUpdate({
        set: {
          fetchedAt,
          lastAttemptedAt: fetchedAt,
          lastError: null,
        },
        target: [userAwardSync.userId, userAwardSync.source],
      })
      .returning(awardSyncFields);

    if (!sync) {
      throw new Error(`User award sync write failed for ${account.externalId}`);
    }

    return sync;
  });
};

export const markUserAwardsFromLuoguRefreshFailed = async (
  db: Database,
  account: LuoguAwardAccount,
  error: unknown,
  now = new Date()
) => {
  const lastError = truncateRefreshError(getErrorMessage(error));

  const [sync] = await db
    .insert(userAwardSync)
    .values({
      lastAttemptedAt: now,
      lastError,
      source: userAwardSource,
      userId: account.userId,
    })
    .onConflictDoUpdate({
      set: {
        lastAttemptedAt: now,
        lastError,
      },
      target: [userAwardSync.userId, userAwardSync.source],
    })
    .returning(awardSyncFields);

  if (!sync) {
    throw new Error(
      `User award failure write failed for ${account.externalId}`
    );
  }

  return sync;
};

export const getAwardsForPublicProfile = async (
  db: Database,
  input: {
    canRefresh: boolean;
    luoguAccountId: null | string;
    now?: Date;
    userId: string;
  }
): Promise<PublicProfileAwards> => {
  const now = input.now ?? new Date();
  const sync =
    (
      await db
        .select(awardSyncFields)
        .from(userAwardSync)
        .where(
          and(
            eq(userAwardSync.userId, input.userId),
            eq(userAwardSync.source, userAwardSource)
          )
        )
        .limit(1)
    )[0] ?? null;

  const refreshQueueState = await ensureUserAwardsFromLuoguRefresh(db, {
    accountId: input.luoguAccountId,
    canRefresh: input.canRefresh,
    fetchedAt: sync?.fetchedAt ?? null,
    now,
  });
  const syncStatus = getRefreshSyncStatus({
    fetchedAt: sync?.fetchedAt ?? null,
    isQueued: refreshQueueState.isQueued,
    lastError: sync?.lastError ?? null,
  });

  const awards = await db
    .select(awardFields)
    .from(userAward)
    .where(
      and(
        eq(userAward.userId, input.userId),
        eq(userAward.source, userAwardSource)
      )
    )
    .orderBy(asc(userAward.sortOrder));

  return {
    fetchedAt: toIsoString(sync?.fetchedAt ?? null),
    items: awards.map((award) => ({
      contest: award.contest,
      event: award.event,
      level: award.level,
      source: userAwardSource,
      year: award.year,
    })),
    syncStatus,
  };
};
