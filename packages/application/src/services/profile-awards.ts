import type { Database, DatabaseTransaction } from "@hhuacm-dashboard/db";
import {
  userAward,
  userAwardSync,
} from "@hhuacm-dashboard/db/schema/user-award";
import { and, asc, eq } from "drizzle-orm";
import type { LuoguUserPageData } from "../external/online-judge-sources/luogu/api";
import { luoguSource } from "../external/online-judge-sources/luogu/api";
import {
  getRefreshErrorMessage,
  truncateRefreshError,
} from "../refresh/policy";
import type { RefreshSyncStatus } from "../refresh/sync-status";
import { ensureUserAwardsFromLuoguRefresh } from "../refresh/user-awards";
import { commitOjAccountRefresh } from "./oj-account/commit-refresh";
import type { OjAccountIdentity } from "./oj-account/queries";
import { parseNumericUid } from "./oj-account/uid";

type LuoguUserLoader = typeof luoguSource.user;

const userAwardSource = "luogu";

export type AwardTier = "bronze" | "default" | "gold" | "silver";

export interface PublicProfileAward {
  contest: string;
  event: null | string;
  level: string;
  sortOrder: number;
  source: typeof userAwardSource;
  tier: AwardTier;
  year: number;
}

export interface PublicProfileAwards {
  fetchedAt: null | string;
  items: PublicProfileAward[];
  syncStatus: RefreshSyncStatus;
}

interface LuoguAwardAccount extends OjAccountIdentity {
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
  lastError: userAwardSync.lastError,
  source: userAwardSync.source,
  userId: userAwardSync.userId,
} as const;

export const classifyAwardLevel = (level: string): AwardTier => {
  if (level.includes("金") || level.includes("一等")) {
    return "gold";
  }

  if (level.includes("银") || level.includes("二等")) {
    return "silver";
  }

  if (level.includes("铜") || level.includes("三等")) {
    return "bronze";
  }

  return "default";
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
  const uid = parseNumericUid(account.externalId);

  if (uid === null) {
    throw new Error("Luogu UID is missing");
  }

  const awards = selectLuoguUserAwards(await loadUser({ uid }));
  const fetchedAt = now;

  await commitOjAccountRefresh(db, account, async (tx) => {
    await replaceLuoguUserAwards(tx, account, awards);

    await tx
      .insert(userAwardSync)
      .values({
        fetchedAt,
        lastError: null,
        source: userAwardSource,
        userId: account.userId,
      })
      .onConflictDoUpdate({
        set: {
          fetchedAt,
          lastError: null,
        },
        target: [userAwardSync.userId, userAwardSync.source],
      });
  });
};

export const markUserAwardsFromLuoguRefreshFailed = async (
  db: Database,
  account: LuoguAwardAccount,
  error: unknown
) => {
  const lastError = truncateRefreshError(getRefreshErrorMessage(error));

  await commitOjAccountRefresh(db, account, async (tx) => {
    await tx
      .insert(userAwardSync)
      .values({
        lastError,
        source: userAwardSource,
        userId: account.userId,
      })
      .onConflictDoUpdate({
        set: {
          lastError,
        },
        target: [userAwardSync.userId, userAwardSync.source],
      });
  });
};

export const deleteLuoguUserAwards = async (
  db: Database | DatabaseTransaction,
  userId: string
) => {
  await db
    .delete(userAward)
    .where(
      and(eq(userAward.userId, userId), eq(userAward.source, userAwardSource))
    );
  await db
    .delete(userAwardSync)
    .where(
      and(
        eq(userAwardSync.userId, userId),
        eq(userAwardSync.source, userAwardSource)
      )
    );
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

  const syncStatus = await ensureUserAwardsFromLuoguRefresh(db, {
    accountId: input.luoguAccountId,
    canRefresh: input.canRefresh,
    fetchedAt: sync?.fetchedAt ?? null,
    lastError: sync?.lastError ?? null,
    now,
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
    fetchedAt: sync?.fetchedAt?.toISOString() ?? null,
    items: awards.map((award) => ({
      contest: award.contest,
      event: award.event,
      level: award.level,
      sortOrder: award.sortOrder,
      source: userAwardSource,
      tier: classifyAwardLevel(award.level),
      year: award.year,
    })),
    syncStatus,
  };
};
