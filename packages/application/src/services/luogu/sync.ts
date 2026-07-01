import type { Database, DatabaseTransaction } from "@hhuacm-dashboard/db";
import {
  luoguAcceptedProblem,
  luoguAccountStats,
} from "@hhuacm-dashboard/db/schema/luogu-account-stats";
import { userOjAccount } from "@hhuacm-dashboard/db/schema/oj-account";
import { eq } from "drizzle-orm";
import type { LuoguPracticePageData } from "../../external/online-judge-sources/luogu/api";
import { luoguSource } from "../../external/online-judge-sources/luogu/api";
import { truncateRefreshError } from "../../refresh/policy";
import type { OjAccountIdentity } from "../oj-account/queries";
import { summarizeLuoguPracticeStats } from "./summary";
import { parseLuoguUid } from "./uid";

type LuoguPracticeLoader = typeof luoguSource.practice;

const acceptedProblemChunkSize = 300;

interface LuoguPracticeStatsFields {
  passed: LuoguPracticePageData["passed"];
  passedProblemCount: LuoguPracticePageData["user"]["passedProblemCount"];
  userName: LuoguPracticePageData["user"]["name"];
}

const luoguStatsFields = {
  acceptedProblemCount: luoguAccountStats.acceptedProblemCount,
  acceptedWeightedScore: luoguAccountStats.acceptedWeightedScore,
  accountId: luoguAccountStats.accountId,
  averageAcceptedDifficulty: luoguAccountStats.averageAcceptedDifficulty,
  fetchedAt: luoguAccountStats.fetchedAt,
  lastAttemptedAt: luoguAccountStats.lastAttemptedAt,
  lastError: luoguAccountStats.lastError,
} as const;

const chunks = <T>(items: T[], size: number) => {
  const result: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }

  return result;
};

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Unknown Luogu sync error";

const selectLuoguPracticeStatsFields = (
  practice: LuoguPracticePageData
): LuoguPracticeStatsFields => ({
  passed: practice.passed,
  passedProblemCount: practice.user.passedProblemCount,
  userName: practice.user.name,
});

const writeAcceptedProblems = async (
  tx: DatabaseTransaction,
  account: OjAccountIdentity,
  practice: LuoguPracticeStatsFields
) => {
  const problemsByPid = new Map(
    practice.passed.map((problem) => [problem.pid, problem])
  );

  await tx
    .delete(luoguAcceptedProblem)
    .where(eq(luoguAcceptedProblem.accountId, account.id));

  for (const chunk of chunks(
    [...problemsByPid.values()],
    acceptedProblemChunkSize
  )) {
    if (chunk.length === 0) {
      continue;
    }

    await tx.insert(luoguAcceptedProblem).values(
      chunk.map((problem) => ({
        accountId: account.id,
        difficulty: problem.difficulty,
        name: problem.name,
        pid: problem.pid,
        type: problem.type,
      }))
    );
  }
};

export const syncLuoguAccountStats = async (
  db: Database,
  account: OjAccountIdentity,
  now = new Date(),
  loadPractice: LuoguPracticeLoader = luoguSource.practice
) => {
  const uid = parseLuoguUid(account.externalId);

  if (uid === null) {
    throw new Error("Luogu UID is missing");
  }

  const practice = selectLuoguPracticeStatsFields(await loadPractice({ uid }));
  const summary = summarizeLuoguPracticeStats(practice);
  const fetchedAt = now;

  return await db.transaction(async (tx) => {
    await writeAcceptedProblems(tx, account, practice);

    if (account.handle !== practice.userName) {
      await tx
        .update(userOjAccount)
        .set({ handle: practice.userName })
        .where(eq(userOjAccount.id, account.id));
    }

    const [stats] = await tx
      .insert(luoguAccountStats)
      .values({
        acceptedProblemCount: summary.acceptedProblemCount,
        acceptedWeightedScore: summary.acceptedWeightedScore,
        accountId: account.id,
        averageAcceptedDifficulty: summary.averageAcceptedDifficulty,
        fetchedAt,
        lastAttemptedAt: fetchedAt,
        lastError: null,
      })
      .onConflictDoUpdate({
        set: {
          acceptedProblemCount: summary.acceptedProblemCount,
          acceptedWeightedScore: summary.acceptedWeightedScore,
          averageAcceptedDifficulty: summary.averageAcceptedDifficulty,
          fetchedAt,
          lastAttemptedAt: fetchedAt,
          lastError: null,
        },
        target: luoguAccountStats.accountId,
      })
      .returning(luoguStatsFields);

    if (!stats) {
      throw new Error(`Luogu stats write failed for ${account.externalId}`);
    }

    return stats;
  });
};

export const markLuoguAccountStatsRefreshFailed = async (
  db: Database,
  account: OjAccountIdentity,
  error: unknown,
  now = new Date()
) => {
  const lastError = truncateRefreshError(getErrorMessage(error));

  const [stats] = await db
    .insert(luoguAccountStats)
    .values({
      accountId: account.id,
      lastAttemptedAt: now,
      lastError,
    })
    .onConflictDoUpdate({
      set: {
        lastAttemptedAt: now,
        lastError,
      },
      target: luoguAccountStats.accountId,
    })
    .returning(luoguStatsFields);

  if (!stats) {
    throw new Error(`Luogu failure write failed for ${account.externalId}`);
  }

  return stats;
};

export const deleteLuoguStats = async (db: Database, accountId: string) => {
  await db
    .delete(luoguAcceptedProblem)
    .where(eq(luoguAcceptedProblem.accountId, accountId));
  await db
    .delete(luoguAccountStats)
    .where(eq(luoguAccountStats.accountId, accountId));
};
