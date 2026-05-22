import type { OjPlatform } from "@hhuacm-dashboard/domain";

import type { Context } from "../../context";
import { deleteRefreshJob, enqueueRefreshJob } from "./job-store";
import {
  codeforcesAccountStatsJobKind,
  luoguAccountStatsJobKind,
  luoguProblemDetailsJobKind,
  userAwardsFromLuoguJobKind,
} from "./job-types";

type Database = Context["db"];

export interface OjAccountRefreshTarget {
  id: string;
  platform: OjPlatform;
}

export const requestCodeforcesAccountStatsRefresh = async (
  db: Database,
  accountId: string
) => {
  await enqueueRefreshJob(db, {
    kind: codeforcesAccountStatsJobKind,
    targetId: accountId,
  });
};

export const requestLuoguAccountStatsRefresh = async (
  db: Database,
  accountId: string
) => {
  await enqueueRefreshJob(db, {
    kind: luoguAccountStatsJobKind,
    targetId: accountId,
  });
};

const requestLuoguProblemDetailsRefresh = async (db: Database, pid: string) => {
  await enqueueRefreshJob(db, {
    kind: luoguProblemDetailsJobKind,
    targetId: pid,
  });
};

export const requestLuoguProblemDetailsRefreshes = async (
  db: Database,
  pids: string[]
) => {
  for (const pid of new Set(pids)) {
    await requestLuoguProblemDetailsRefresh(db, pid);
  }
};

export const requestUserAwardsFromLuoguRefresh = async (
  db: Database,
  accountId: string
) => {
  await enqueueRefreshJob(db, {
    kind: userAwardsFromLuoguJobKind,
    targetId: accountId,
  });
};

const clearCodeforcesAccountStatsRefreshRequest = (
  db: Database,
  accountId: string
) =>
  deleteRefreshJob(db, {
    kind: codeforcesAccountStatsJobKind,
    targetId: accountId,
  });

const clearLuoguAccountStatsRefreshRequest = (
  db: Database,
  accountId: string
) =>
  deleteRefreshJob(db, {
    kind: luoguAccountStatsJobKind,
    targetId: accountId,
  });

const clearUserAwardsFromLuoguRefreshRequest = (
  db: Database,
  accountId: string
) =>
  deleteRefreshJob(db, {
    kind: userAwardsFromLuoguJobKind,
    targetId: accountId,
  });

export const requestOjAccountRefresh = async (
  db: Database,
  account: OjAccountRefreshTarget
) => {
  if (account.platform === "codeforces") {
    await requestCodeforcesAccountStatsRefresh(db, account.id);
    return;
  }

  if (account.platform === "luogu") {
    await requestLuoguAccountStatsRefresh(db, account.id);
    await requestUserAwardsFromLuoguRefresh(db, account.id);
  }
};

export const clearOjAccountRefresh = async (
  db: Database,
  account: OjAccountRefreshTarget
) => {
  if (account.platform === "codeforces") {
    await clearCodeforcesAccountStatsRefreshRequest(db, account.id);
    return;
  }

  if (account.platform === "luogu") {
    await clearLuoguAccountStatsRefreshRequest(db, account.id);
    await clearUserAwardsFromLuoguRefreshRequest(db, account.id);
  }
};
