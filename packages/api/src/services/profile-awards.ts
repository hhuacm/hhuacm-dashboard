import {
  userAward,
  userAwardSync,
} from "@hhuacm-dashboard/db/schema/user-award";
import { and, asc, eq } from "drizzle-orm";

import type { Context } from "../context";
import type { LuoguUserPageData } from "../external/online-judge-sources/luogu/api";
import { luoguSource } from "../external/online-judge-sources/luogu/api";
import { parseLuoguUidFromProfileUrl } from "./luogu/profile-stats";
import type { LuoguAccount } from "./luogu/types";
import { refreshDefaults } from "./refresh/constants";
import {
  enqueueUserAwardsFromLuoguRefresh,
  getRefreshJobForUserAwardsFromLuogu,
} from "./refresh/queue";

type Database = Context["db"];
type LuoguUserLoader = typeof luoguSource.user;

const userAwardSource = "luogu";

export type ProfileAwardStatus = "empty" | "failed" | "ready" | "refreshing";

export interface PublicProfileAward {
  contest: string;
  event: null | string;
  level: string;
  source: typeof userAwardSource;
  sourceHandle: string;
  sourceProfileUrl: string;
  year: number;
}

export interface PublicProfileAwards {
  fetchedAt: null | string;
  items: PublicProfileAward[];
  lastError: null | string;
  syncStatus: ProfileAwardStatus;
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
  fetchedAt: userAward.fetchedAt,
  level: userAward.level,
  sortOrder: userAward.sortOrder,
  source: userAward.source,
  sourceHandle: userAward.sourceHandle,
  sourceProfileUrl: userAward.sourceProfileUrl,
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

const truncateError = (message: string) =>
  message.slice(0, refreshDefaults.maxErrorLength);

const hasActiveRefreshJob = (
  refreshJobs: Awaited<ReturnType<typeof getRefreshJobForUserAwardsFromLuogu>>
) =>
  refreshJobs.some(
    (job) => job.status === "pending" || job.status === "running"
  );

const isFreshUserAwards = (
  sync: null | { fetchedAt: Date | null },
  now: Date
) =>
  Boolean(
    sync?.fetchedAt &&
      now.getTime() - sync.fetchedAt.getTime() < refreshDefaults.userAwardsTtlMs
  );

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
  tx: Parameters<Parameters<Database["transaction"]>[0]>[0],
  account: LuoguAwardAccount,
  awards: SelectedLuoguUserAward[],
  fetchedAt: Date
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
    fetchedAt,
    level: award.level,
    sortOrder: award.sortOrder,
    source: userAwardSource,
    sourceHandle: account.handle,
    sourceProfileUrl: account.profileUrl,
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
  const uid = parseLuoguUidFromProfileUrl(account.profileUrl);

  if (uid === null) {
    throw new Error("Luogu UID is missing");
  }

  const awards = selectLuoguUserAwards(await loadUser({ uid }));
  const fetchedAt = now;

  return await db.transaction(async (tx) => {
    await replaceLuoguUserAwards(tx, account, awards, fetchedAt);

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
          updatedAt: fetchedAt,
        },
        target: [userAwardSync.userId, userAwardSync.source],
      })
      .returning(awardSyncFields);

    if (!sync) {
      throw new Error(`User award sync write failed for ${account.handle}`);
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
  const lastError = truncateError(getErrorMessage(error));

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
        updatedAt: now,
      },
      target: [userAwardSync.userId, userAwardSync.source],
    })
    .returning(awardSyncFields);

  if (!sync) {
    throw new Error(`User award failure write failed for ${account.handle}`);
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

  const shouldRefresh =
    input.canRefresh &&
    input.luoguAccountId !== null &&
    !isFreshUserAwards(sync, now);

  if (shouldRefresh && input.luoguAccountId !== null) {
    await enqueueUserAwardsFromLuoguRefresh(db, input.luoguAccountId);
  }

  const refreshJobs =
    !input.canRefresh || input.luoguAccountId === null
      ? []
      : await getRefreshJobForUserAwardsFromLuogu(db, input.luoguAccountId);
  const syncStatus = (() => {
    if (hasActiveRefreshJob(refreshJobs)) {
      return "refreshing";
    }

    if (sync?.lastError) {
      return "failed";
    }

    return sync?.fetchedAt ? "ready" : "empty";
  })();

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
      sourceHandle: award.sourceHandle,
      sourceProfileUrl: award.sourceProfileUrl,
      year: award.year,
    })),
    lastError: sync?.lastError ?? null,
    syncStatus,
  };
};
