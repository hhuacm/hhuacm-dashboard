import type { Database } from "@hhuacm-dashboard/db";
import {
  luoguAcceptedProblem,
  luoguAccountStats,
} from "@hhuacm-dashboard/db/schema/luogu-account-stats";
import { eq } from "drizzle-orm";
import { ensureLuoguAccountStatsRefresh } from "../../refresh/ensure";
import {
  getRefreshSyncStatus,
  type RefreshSyncStatus,
} from "../../refresh/sync-status";
import type { OjAccountIdentity } from "../oj-account/queries";
import { parseLuoguUid } from "./uid";

interface PublicLuoguDifficultyCount {
  count: number;
  difficulty: number;
  label: string;
}

export interface PublicLuoguStats {
  acceptedProblemCount: null | number;
  acceptedWeightedScore: null | number;
  averageAcceptedDifficulty: null | number;
  difficultyCounts: PublicLuoguDifficultyCount[];
  fetchedAt: null | string;
  syncStatus: RefreshSyncStatus;
}

interface LuoguAcceptedProblemDifficultyInput {
  difficulty: null | number;
}

export const luoguDifficultyLabels = [
  "暂无评定",
  "入门",
  "普及-",
  "普及/提高-",
  "普及+/提高",
  "提高+/省选-",
  "省选/NOI-",
  "NOI/NOI+/CTSC",
] as const;

export const summarizeLuoguDifficultyCounts = (
  problems: LuoguAcceptedProblemDifficultyInput[]
): PublicLuoguStats["difficultyCounts"] => {
  const counts = new Map<number, number>();

  for (const problem of problems) {
    if (problem.difficulty === null) {
      continue;
    }

    counts.set(problem.difficulty, (counts.get(problem.difficulty) ?? 0) + 1);
  }

  return luoguDifficultyLabels.map((label, difficulty) => ({
    count: counts.get(difficulty) ?? 0,
    difficulty,
    label,
  }));
};

const toIsoString = (date: Date | null) => date?.toISOString() ?? null;

const getLuoguStats = async (db: Database, accountId: string) =>
  (
    await db
      .select({
        acceptedProblemCount: luoguAccountStats.acceptedProblemCount,
        acceptedWeightedScore: luoguAccountStats.acceptedWeightedScore,
        averageAcceptedDifficulty: luoguAccountStats.averageAcceptedDifficulty,
        fetchedAt: luoguAccountStats.fetchedAt,
        lastAttemptedAt: luoguAccountStats.lastAttemptedAt,
        lastError: luoguAccountStats.lastError,
      })
      .from(luoguAccountStats)
      .where(eq(luoguAccountStats.accountId, accountId))
      .limit(1)
  )[0] ?? null;

const getLuoguAcceptedProblems = async (db: Database, accountId: string) =>
  await db
    .select({
      difficulty: luoguAcceptedProblem.difficulty,
    })
    .from(luoguAcceptedProblem)
    .where(eq(luoguAcceptedProblem.accountId, accountId));

export const getLuoguStatsForProfile = async (
  db: Database,
  account: OjAccountIdentity
): Promise<PublicLuoguStats | null> => {
  const uid = parseLuoguUid(account.externalId);
  const emptyDifficultyCounts = summarizeLuoguDifficultyCounts([]);

  if (uid === null) {
    return {
      acceptedProblemCount: null,
      acceptedWeightedScore: null,
      averageAcceptedDifficulty: null,
      difficultyCounts: emptyDifficultyCounts,
      fetchedAt: null,
      syncStatus: "empty",
    };
  }

  const now = new Date();
  const currentStats = await getLuoguStats(db, account.id);
  const refreshQueueState = await ensureLuoguAccountStatsRefresh(db, {
    accountId: account.id,
    fetchedAt: currentStats?.fetchedAt ?? null,
    now,
  });
  const syncStatus = getRefreshSyncStatus({
    fetchedAt: currentStats?.fetchedAt ?? null,
    isQueued: refreshQueueState.isQueued,
    lastError: currentStats?.lastError ?? null,
  });

  if (!currentStats?.fetchedAt) {
    return {
      acceptedProblemCount: null,
      acceptedWeightedScore: null,
      averageAcceptedDifficulty: null,
      difficultyCounts: emptyDifficultyCounts,
      fetchedAt: null,
      syncStatus,
    };
  }

  const acceptedProblems = await getLuoguAcceptedProblems(db, account.id);
  const difficultyCounts = summarizeLuoguDifficultyCounts(acceptedProblems);

  return {
    acceptedProblemCount: currentStats.acceptedProblemCount,
    acceptedWeightedScore: currentStats.acceptedWeightedScore,
    averageAcceptedDifficulty: currentStats.averageAcceptedDifficulty,
    difficultyCounts,
    fetchedAt: toIsoString(currentStats.fetchedAt),
    syncStatus,
  };
};
