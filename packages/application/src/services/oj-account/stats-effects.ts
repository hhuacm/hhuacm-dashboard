import type { Database } from "@hhuacm-dashboard/db";
import { currentMember } from "@hhuacm-dashboard/db/schema/current-member";
import type { OjPlatform } from "@hhuacm-dashboard/domain";
import { eq } from "drizzle-orm";
import { atcoderAccountStatsJob } from "../../refresh/jobs/atcoder-account-stats";
import { codeforcesAccountStatsJob } from "../../refresh/jobs/codeforces-account-stats";
import { luoguAccountStatsJob } from "../../refresh/jobs/luogu-account-stats";
import { nowcoderAccountStatsJob } from "../../refresh/jobs/nowcoder-account-stats";
import { userAwardsFromLuoguJob } from "../../refresh/jobs/user-awards-from-luogu";
import { deleteAtcoderStats } from "../atcoder/sync";
import { deleteCodeforcesStats } from "../codeforces/stats-cache";
import { deleteLuoguStats } from "../luogu/sync";
import { deleteNowcoderStats } from "../nowcoder/sync";
import { listInternalOjAccountsByUserId } from "./queries";

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

const clearAtcoderStatsIfNeeded = async (
  db: Database,
  account: AccountStatsEffectTarget
) => {
  if (account.platform === "atcoder") {
    await deleteAtcoderStats(db, account.id);
    await atcoderAccountStatsJob.clear(db, account.id);
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

const clearNowcoderStatsIfNeeded = async (
  db: Database,
  account: AccountStatsEffectTarget
) => {
  if (account.platform === "nowcoder") {
    await deleteNowcoderStats(db, account.id);
    await nowcoderAccountStatsJob.clear(db, account.id);
  }
};

export const resetOjAccountStatsEffects = async (
  db: Database,
  account: AccountStatsEffectTarget
) => {
  await clearAtcoderStatsIfNeeded(db, account);
  await clearCodeforcesStatsIfNeeded(db, account);
  await clearLuoguStatsIfNeeded(db, account);
  await clearNowcoderStatsIfNeeded(db, account);
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
  if (
    !(
      account.platform === "atcoder" ||
      account.platform === "codeforces" ||
      account.platform === "luogu" ||
      account.platform === "nowcoder"
    )
  ) {
    return;
  }

  if (!(await isCurrentMember(db, userId))) {
    return;
  }

  if (account.platform === "atcoder") {
    await atcoderAccountStatsJob.enqueue(db, account.id);
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

  if (account.platform === "nowcoder") {
    await nowcoderAccountStatsJob.enqueue(db, account.id);
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
