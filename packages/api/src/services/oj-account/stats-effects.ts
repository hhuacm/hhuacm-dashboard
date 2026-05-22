import { userProfile } from "@hhuacm-dashboard/db/schema/profile";
import { defaultMemberStatus, type OjPlatform } from "@hhuacm-dashboard/domain";
import { eq } from "drizzle-orm";

import { deleteCodeforcesStats } from "../codeforces/stats-cache";
import { deleteLuoguStats } from "../luogu/sync";
import { isPublicActivityMemberStatus } from "../member-status";
import {
  deleteCodeforcesAccountStatsRefreshJob,
  deleteLuoguAccountStatsRefreshJob,
  deleteUserAwardsFromLuoguRefreshJob,
  enqueueCodeforcesAccountStatsRefresh,
  enqueueLuoguAccountStatsRefresh,
  enqueueUserAwardsFromLuoguRefresh,
} from "../refresh/queue";
import type { Database } from "./types";

export interface AccountStatsEffectTarget {
  id: string;
  platform: OjPlatform;
}

export const clearCodeforcesStatsIfNeeded = async (
  db: Database,
  account: AccountStatsEffectTarget
) => {
  if (account.platform === "codeforces") {
    await deleteCodeforcesStats(db, account.id);
    await deleteCodeforcesAccountStatsRefreshJob(db, account.id);
  }
};
export const clearLuoguStatsIfNeeded = async (
  db: Database,
  account: AccountStatsEffectTarget
) => {
  if (account.platform === "luogu") {
    await deleteLuoguStats(db, account.id);
    await deleteLuoguAccountStatsRefreshJob(db, account.id);
  }
};

export const clearLuoguAwardRefreshIfNeeded = async (
  db: Database,
  account: AccountStatsEffectTarget
) => {
  if (account.platform === "luogu") {
    await deleteUserAwardsFromLuoguRefreshJob(db, account.id);
  }
};

export const resetOjAccountStatsEffects = async (
  db: Database,
  account: AccountStatsEffectTarget
) => {
  await clearCodeforcesStatsIfNeeded(db, account);
  await clearLuoguStatsIfNeeded(db, account);
  await clearLuoguAwardRefreshIfNeeded(db, account);
};

const isPublicActivityUser = async (db: Database, userId: string) => {
  const [profile] = await db
    .select({ memberStatus: userProfile.memberStatus })
    .from(userProfile)
    .where(eq(userProfile.userId, userId))
    .limit(1);
  const memberStatus = profile?.memberStatus ?? defaultMemberStatus;

  return isPublicActivityMemberStatus(memberStatus);
};

export const enqueueOjAccountRefreshEffectsIfNeeded = async (
  db: Database,
  account: AccountStatsEffectTarget,
  userId: string
) => {
  if (!(account.platform === "codeforces" || account.platform === "luogu")) {
    return;
  }

  if (!(await isPublicActivityUser(db, userId))) {
    return;
  }

  if (account.platform === "codeforces") {
    await enqueueCodeforcesAccountStatsRefresh(db, account.id);
  }

  if (account.platform === "luogu") {
    await enqueueLuoguAccountStatsRefresh(db, account.id);
    await enqueueUserAwardsFromLuoguRefresh(db, account.id);
  }
};
