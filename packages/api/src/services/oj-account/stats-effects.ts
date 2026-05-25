import { currentMember } from "@hhuacm-dashboard/db/schema/current-member";
import type { OjPlatform } from "@hhuacm-dashboard/domain";
import { eq } from "drizzle-orm";

import type { Context } from "../../context";
import { deleteCodeforcesStats } from "../codeforces/stats-cache";
import { deleteLuoguStats } from "../luogu/sync";
import { codeforcesAccountStatsJob } from "../refresh/jobs/codeforces-account-stats";
import { luoguAccountStatsJob } from "../refresh/jobs/luogu-account-stats";
import { userAwardsFromLuoguJob } from "../refresh/jobs/user-awards-from-luogu";
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
    await codeforcesAccountStatsJob.clear(db, account.id);
  }
};
const clearLuoguStatsIfNeeded = async (
  db: Database,
  account: AccountStatsEffectTarget
) => {
  if (account.platform === "luogu") {
    await deleteLuoguStats(db, account.id);
    await luoguAccountStatsJob.clear(db, account.id);
    await userAwardsFromLuoguJob.clear(db, account.id);
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
  const [currentMemberRow] = await db
    .select({ userId: currentMember.userId })
    .from(currentMember)
    .where(eq(currentMember.userId, userId))
    .limit(1);

  return Boolean(currentMemberRow);
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

  if (account.platform === "codeforces") {
    await codeforcesAccountStatsJob.enqueue(db, account.id);
    return;
  }

  if (account.platform === "luogu") {
    await luoguAccountStatsJob.enqueue(db, account.id);
    await userAwardsFromLuoguJob.enqueue(db, account.id);
  }
};

export const replaceOjAccountStatsEffectsIfNeeded = async (
  db: Database,
  account: AccountStatsEffectTarget,
  userId: string
) => {
  await resetOjAccountStatsEffects(db, account);
  await requestOjAccountRefreshEffectsIfNeeded(db, account, userId);
};
