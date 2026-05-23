import { currentMember } from "@hhuacm-dashboard/db/schema/current-member";
import type { OjPlatform } from "@hhuacm-dashboard/domain";
import { eq } from "drizzle-orm";

import type { Context } from "../../context";
import { deleteCodeforcesStats } from "../codeforces/stats-cache";
import { deleteLuoguStats } from "../luogu/sync";
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

const isCurrentMember = async (db: Database, userId: string) => {
  const [member] = await db
    .select({ userId: currentMember.userId })
    .from(currentMember)
    .where(eq(currentMember.userId, userId))
    .limit(1);

  return Boolean(member);
};

export const requestOjAccountRefreshEffectsIfNeeded = async (
  db: Database,
  account: AccountStatsEffectTarget,
  userId: string
) => {
  if (!(account.platform === "codeforces" || account.platform === "luogu")) {
    return;
  }

  if (!(await isCurrentMember(db, userId))) {
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
