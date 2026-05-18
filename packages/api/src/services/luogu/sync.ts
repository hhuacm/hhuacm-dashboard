import {
  luoguAcceptedProblem,
  luoguAccountStats,
} from "@hhuacm-dashboard/db/schema/luogu-account-stats";
import { and, eq, lt, sql } from "drizzle-orm";

import type { Context } from "../../context";
import type { LuoguUserPracticeDto } from "../../external/online-judge-sources/luogu/api";
import { luoguSource } from "../../external/online-judge-sources/luogu/api";
import { refreshDefaults } from "../refresh/constants";
import { parseLuoguUidFromProfileUrl } from "./profile-stats";
import { summarizeLuoguPracticeStats } from "./summary";
import type { LuoguAccount } from "./types";

type Database = Context["db"];
type LuoguPracticeLoader = typeof luoguSource.practice;

const acceptedProblemChunkSize = 300;

const luoguStatsFields = {
  acceptedProblemCount: luoguAccountStats.acceptedProblemCount,
  acceptedWeightedScore: luoguAccountStats.acceptedWeightedScore,
  accountId: luoguAccountStats.accountId,
  averageAcceptedDifficulty: luoguAccountStats.averageAcceptedDifficulty,
  fetchedAt: luoguAccountStats.fetchedAt,
  lastAttemptedAt: luoguAccountStats.lastAttemptedAt,
  lastError: luoguAccountStats.lastError,
  uid: luoguAccountStats.uid,
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

const truncateError = (message: string) =>
  message.slice(0, refreshDefaults.maxErrorLength);

const writeAcceptedProblems = async (
  tx: Parameters<Parameters<Database["transaction"]>[0]>[0],
  account: LuoguAccount,
  practice: LuoguUserPracticeDto,
  fetchedAt: Date
) => {
  for (const chunk of chunks(practice.passed, acceptedProblemChunkSize)) {
    if (chunk.length === 0) {
      continue;
    }

    await tx
      .insert(luoguAcceptedProblem)
      .values(
        chunk.map((problem) => ({
          accountId: account.id,
          difficulty: problem.difficulty,
          firstSeenAt: fetchedAt,
          lastSeenAt: fetchedAt,
          name: problem.name,
          pid: problem.pid,
          type: problem.type,
        }))
      )
      .onConflictDoUpdate({
        set: {
          difficulty: sql`excluded.difficulty`,
          lastSeenAt: fetchedAt,
          name: sql`excluded.name`,
          type: sql`excluded.type`,
        },
        target: [luoguAcceptedProblem.accountId, luoguAcceptedProblem.pid],
      });
  }

  await tx
    .delete(luoguAcceptedProblem)
    .where(
      and(
        eq(luoguAcceptedProblem.accountId, account.id),
        lt(luoguAcceptedProblem.lastSeenAt, fetchedAt)
      )
    );
};

export const syncLuoguAccountStats = async (
  db: Database,
  account: LuoguAccount,
  now = new Date(),
  loadPractice: LuoguPracticeLoader = luoguSource.practice
) => {
  const uid = parseLuoguUidFromProfileUrl(account.profileUrl);

  if (uid === null) {
    throw new Error("Luogu UID is missing");
  }

  const practice = await loadPractice({ uid });
  const summary = summarizeLuoguPracticeStats(practice);
  const fetchedAt = now;

  return await db.transaction(async (tx) => {
    await writeAcceptedProblems(tx, account, practice, fetchedAt);

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
        uid,
      })
      .onConflictDoUpdate({
        set: {
          acceptedProblemCount: summary.acceptedProblemCount,
          acceptedWeightedScore: summary.acceptedWeightedScore,
          averageAcceptedDifficulty: summary.averageAcceptedDifficulty,
          fetchedAt,
          lastAttemptedAt: fetchedAt,
          lastError: null,
          uid,
          updatedAt: fetchedAt,
        },
        target: luoguAccountStats.accountId,
      })
      .returning(luoguStatsFields);

    if (!stats) {
      throw new Error(`Luogu stats write failed for ${account.handle}`);
    }

    return stats;
  });
};

export const markLuoguAccountStatsRefreshFailed = async (
  db: Database,
  account: LuoguAccount,
  error: unknown,
  now = new Date()
) => {
  const uid = parseLuoguUidFromProfileUrl(account.profileUrl);
  const lastError = truncateError(getErrorMessage(error));

  const [stats] = await db
    .insert(luoguAccountStats)
    .values({
      accountId: account.id,
      lastAttemptedAt: now,
      lastError,
      uid,
    })
    .onConflictDoUpdate({
      set: {
        lastAttemptedAt: now,
        lastError,
        uid,
        updatedAt: now,
      },
      target: luoguAccountStats.accountId,
    })
    .returning(luoguStatsFields);

  if (!stats) {
    throw new Error(`Luogu failure write failed for ${account.handle}`);
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
