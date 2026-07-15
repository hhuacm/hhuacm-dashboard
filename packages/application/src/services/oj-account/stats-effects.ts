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

type AccountStatsEffect = (db: Database, accountId: string) => Promise<unknown>;

interface AccountStatsEffects {
  clear: AccountStatsEffect[];
  enqueue: AccountStatsEffect[];
}

const accountStatsEffects = {
  atcoder: {
    clear: [deleteAtcoderStats, atcoderAccountStatsJob.clear],
    enqueue: [atcoderAccountStatsJob.enqueue],
  },
  codeforces: {
    clear: [deleteCodeforcesStats, codeforcesAccountStatsJob.clear],
    enqueue: [codeforcesAccountStatsJob.enqueue],
  },
  luogu: {
    clear: [
      deleteLuoguStats,
      luoguAccountStatsJob.clear,
      userAwardsFromLuoguJob.clear,
    ],
    enqueue: [luoguAccountStatsJob.enqueue, userAwardsFromLuoguJob.enqueue],
  },
  nowcoder: {
    clear: [deleteNowcoderStats, nowcoderAccountStatsJob.clear],
    enqueue: [nowcoderAccountStatsJob.enqueue],
  },
} satisfies Record<OjPlatform, AccountStatsEffects>;

const runAccountStatsEffects = async (
  db: Database,
  account: AccountStatsEffectTarget,
  kind: keyof AccountStatsEffects
) => {
  for (const effect of accountStatsEffects[account.platform][kind]) {
    await effect(db, account.id);
  }
};

export const clearCodeforcesStatsIfNeeded = async (
  db: Database,
  account: AccountStatsEffectTarget
) => {
  if (account.platform === "codeforces") {
    await runAccountStatsEffects(db, account, "clear");
  }
};

export const resetOjAccountStatsEffects = async (
  db: Database,
  account: AccountStatsEffectTarget
) => {
  await runAccountStatsEffects(db, account, "clear");
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
  if (!(await isCurrentMember(db, userId))) {
    return;
  }

  await runAccountStatsEffects(db, account, "enqueue");
};

export const replaceOjAccountStatsEffectsIfNeeded = async (
  db: Database,
  account: AccountStatsEffectTarget,
  userId: string
) => {
  await resetOjAccountStatsEffects(db, account);
  await requestOjAccountRefreshEffectsIfNeeded(db, account, userId);
};
