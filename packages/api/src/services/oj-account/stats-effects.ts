import { userProfile } from "@hhuacm-dashboard/db/schema/profile";
import { defaultMemberStatus, type OjPlatform } from "@hhuacm-dashboard/domain";
import { eq } from "drizzle-orm";

import type { Context } from "../../context";
import { deleteCodeforcesStats } from "../codeforces/stats-cache";
import { deleteLuoguStats } from "../luogu/sync";
import { isPublicActivityMemberStatus } from "../member-status";
import {
  clearOjAccountRefresh,
  requestOjAccountRefresh,
} from "../refresh/requests";
import { listInternalOjAccountsByUserId } from "./queries";

type Database = Context["db"];

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
    await clearOjAccountRefresh(db, account);
  }
};
export const clearLuoguStatsIfNeeded = async (
  db: Database,
  account: AccountStatsEffectTarget
) => {
  if (account.platform === "luogu") {
    await deleteLuoguStats(db, account.id);
    await clearOjAccountRefresh(db, account);
  }
};

export const resetOjAccountStatsEffects = async (
  db: Database,
  account: AccountStatsEffectTarget
) => {
  await clearCodeforcesStatsIfNeeded(db, account);
  await clearLuoguStatsIfNeeded(db, account);
};

export const clearCodeforcesStatsForUserAccounts = async (
  db: Database,
  userId: string
) => {
  const accounts = await listInternalOjAccountsByUserId(db, userId);

  for (const account of accounts) {
    await clearCodeforcesStatsIfNeeded(db, account);
  }
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

export const requestOjAccountRefreshEffectsIfNeeded = async (
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

  await requestOjAccountRefresh(db, account);
};

export const replaceOjAccountStatsEffectsIfNeeded = async (
  db: Database,
  account: AccountStatsEffectTarget,
  userId: string
) => {
  await resetOjAccountStatsEffects(db, account);
  await requestOjAccountRefreshEffectsIfNeeded(db, account, userId);
};
