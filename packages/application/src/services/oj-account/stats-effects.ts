import type { Database } from "@hhuacm-dashboard/db";
import { currentMember } from "@hhuacm-dashboard/db/schema/current-member";
import type { OjPlatform } from "@hhuacm-dashboard/domain";
import { eq } from "drizzle-orm";
import { atcoderAccountStatsJob } from "../../refresh/jobs/atcoder-account-stats";
import { codeforcesAccountStatsJob } from "../../refresh/jobs/codeforces-account-stats";
import type { RefreshJobDefinition } from "../../refresh/jobs/definition";
import { luoguAccountStatsJob } from "../../refresh/jobs/luogu-account-stats";
import { nowcoderAccountStatsJob } from "../../refresh/jobs/nowcoder-account-stats";
import { userAwardsFromLuoguJob } from "../../refresh/jobs/user-awards-from-luogu";
import type { RefreshQueueDatabase } from "../../refresh/request-store";
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
  clearStats: AccountStatsEffect[];
  refreshJobs: RefreshJobDefinition[];
}

const accountStatsEffects = {
  atcoder: {
    clearStats: [deleteAtcoderStats],
    refreshJobs: [atcoderAccountStatsJob],
  },
  codeforces: {
    clearStats: [deleteCodeforcesStats],
    refreshJobs: [codeforcesAccountStatsJob],
  },
  luogu: {
    clearStats: [deleteLuoguStats],
    refreshJobs: [luoguAccountStatsJob, userAwardsFromLuoguJob],
  },
  nowcoder: {
    clearStats: [deleteNowcoderStats],
    refreshJobs: [nowcoderAccountStatsJob],
  },
} satisfies Record<OjPlatform, AccountStatsEffects>;

const clearOjAccountRefreshRequests = async (
  db: RefreshQueueDatabase,
  account: AccountStatsEffectTarget
) => {
  for (const job of accountStatsEffects[account.platform].refreshJobs) {
    await job.clear(db, account.id);
  }
};

export const resetOjAccountStatsEffects = async (
  db: Database,
  account: AccountStatsEffectTarget
) => {
  for (const clearStats of accountStatsEffects[account.platform].clearStats) {
    await clearStats(db, account.id);
  }

  await clearOjAccountRefreshRequests(db, account);
};

export const clearOjAccountRefreshRequestsForUser = async (
  db: Database,
  userId: string
) => {
  const accounts = await listInternalOjAccountsByUserId(db, userId);

  for (const account of accounts) {
    await clearOjAccountRefreshRequests(db, account);
  }
};

const isCurrentMember = async (db: RefreshQueueDatabase, userId: string) => {
  const [currentMemberRow] = await db
    .select({ userId: currentMember.userId })
    .from(currentMember)
    .where(eq(currentMember.userId, userId))
    .limit(1);

  return Boolean(currentMemberRow);
};

export const requestOjAccountRefreshEffectsIfNeeded = async (
  db: RefreshQueueDatabase,
  account: AccountStatsEffectTarget,
  userId: string
) => {
  if (!(await isCurrentMember(db, userId))) {
    return 0;
  }

  let refreshRequestCount = 0;

  for (const job of accountStatsEffects[account.platform].refreshJobs) {
    if (await job.enqueue(db, account.id)) {
      refreshRequestCount += 1;
    }
  }

  return refreshRequestCount;
};

export const replaceOjAccountStatsEffectsIfNeeded = async (
  db: Database,
  account: AccountStatsEffectTarget,
  userId: string
) => {
  await resetOjAccountStatsEffects(db, account);
  await requestOjAccountRefreshEffectsIfNeeded(db, account, userId);
};
