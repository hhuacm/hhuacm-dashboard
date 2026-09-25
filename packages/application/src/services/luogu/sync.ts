import type { Database, DatabaseTransaction } from "@hhuacm-dashboard/db";
import {
  luoguAcceptedProblem,
  luoguAccountStats,
} from "@hhuacm-dashboard/db/schema/luogu-account-stats";
import { userOjAccount } from "@hhuacm-dashboard/db/schema/oj-account";
import { eq } from "drizzle-orm";
import type { LuoguPracticePageData } from "../../external/online-judge-sources/luogu/api";
import { luoguSource } from "../../external/online-judge-sources/luogu/api";
import {
  getRefreshErrorMessage,
  truncateRefreshError,
} from "../../refresh/policy";
import { commitOjAccountRefresh } from "../oj-account/commit-refresh";
import type { OjAccountIdentity } from "../oj-account/queries";
import { parseNumericUid } from "../oj-account/uid";
import { summarizeLuoguPracticeStats } from "./summary";

type LuoguPracticeLoader = typeof luoguSource.practice;

const acceptedProblemChunkSize = 300;

interface LuoguPracticeStatsFields {
  passed: LuoguPracticePageData["passed"];
  passedProblemCount: LuoguPracticePageData["user"]["passedProblemCount"];
  userName: LuoguPracticePageData["user"]["name"];
}

const chunks = <T>(items: T[], size: number) => {
  const result: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }

  return result;
};

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
  const uid = parseNumericUid(account.externalId);

  if (uid === null) {
    throw new Error("Luogu UID is missing");
  }

  const practice = selectLuoguPracticeStatsFields(await loadPractice({ uid }));
  const summary = summarizeLuoguPracticeStats(practice);
  const fetchedAt = now;

  await commitOjAccountRefresh(db, account, async (tx) => {
    await writeAcceptedProblems(tx, account, practice);

    if (account.handle !== practice.userName) {
      await tx
        .update(userOjAccount)
        .set({ handle: practice.userName })
        .where(eq(userOjAccount.id, account.id));
    }

    await tx
      .insert(luoguAccountStats)
      .values({
        acceptedProblemCount: summary.acceptedProblemCount,
        acceptedWeightedScore: summary.acceptedWeightedScore,
        accountId: account.id,
        averageAcceptedDifficulty: summary.averageAcceptedDifficulty,
        fetchedAt,
        lastError: null,
      })
      .onConflictDoUpdate({
        set: {
          acceptedProblemCount: summary.acceptedProblemCount,
          acceptedWeightedScore: summary.acceptedWeightedScore,
          averageAcceptedDifficulty: summary.averageAcceptedDifficulty,
          fetchedAt,
          lastError: null,
        },
        target: luoguAccountStats.accountId,
      });
  });
};

export const markLuoguAccountStatsRefreshFailed = async (
  db: Database,
  account: OjAccountIdentity,
  error: unknown
) => {
  const lastError = truncateRefreshError(getRefreshErrorMessage(error));

  await commitOjAccountRefresh(db, account, async (tx) => {
    await tx
      .insert(luoguAccountStats)
      .values({
        accountId: account.id,
        lastError,
      })
      .onConflictDoUpdate({
        set: {
          lastError,
        },
        target: luoguAccountStats.accountId,
      });
  });
};

export const deleteLuoguStats = async (
  db: Database | DatabaseTransaction,
  accountId: string
) => {
  await db
    .delete(luoguAcceptedProblem)
    .where(eq(luoguAcceptedProblem.accountId, accountId));
  await db
    .delete(luoguAccountStats)
    .where(eq(luoguAccountStats.accountId, accountId));
};
