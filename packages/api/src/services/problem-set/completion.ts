import {
  luoguAcceptedProblem,
  luoguAccountStats,
} from "@hhuacm-dashboard/db/schema/luogu-account-stats";
import { userOjAccount } from "@hhuacm-dashboard/db/schema/oj-account";
import { and, eq, inArray } from "drizzle-orm";

import { refreshDefaults } from "../refresh/constants";
import { enqueueLuoguAccountStatsRefresh } from "../refresh/queue";
import type { ProblemSetProblemRecord } from "./records";
import type { Database } from "./types";

const getCurrentLuoguAccount = async (db: Database, userId: null | string) => {
  if (!userId) {
    return null;
  }

  return (
    (
      await db
        .select({
          accountId: userOjAccount.id,
          fetchedAt: luoguAccountStats.fetchedAt,
        })
        .from(userOjAccount)
        .leftJoin(
          luoguAccountStats,
          eq(luoguAccountStats.accountId, userOjAccount.id)
        )
        .where(
          and(
            eq(userOjAccount.userId, userId),
            eq(userOjAccount.platform, "luogu")
          )
        )
        .limit(1)
    )[0] ?? null
  );
};

const enqueueLuoguStatsRefreshIfNeeded = async (
  db: Database,
  account: Awaited<ReturnType<typeof getCurrentLuoguAccount>>
) => {
  if (!account) {
    return;
  }

  const now = Date.now();
  const fetchedAt = account.fetchedAt?.getTime() ?? null;
  const isFresh =
    fetchedAt !== null && now - fetchedAt < refreshDefaults.luoguStatsTtlMs;

  if (!isFresh) {
    await enqueueLuoguAccountStatsRefresh(db, account.accountId);
  }
};

export const getCurrentLuoguCompletionSource = async (
  db: Database,
  currentUserId: null | string
) => {
  const currentLuoguAccount = await getCurrentLuoguAccount(db, currentUserId);

  await enqueueLuoguStatsRefreshIfNeeded(db, currentLuoguAccount);

  if (!currentLuoguAccount?.fetchedAt) {
    return null;
  }

  return {
    accountId: currentLuoguAccount.accountId,
  };
};

const getAcceptedPids = async (
  db: Database,
  input: {
    accountId: string;
    pids: string[];
  }
) => {
  if (input.pids.length === 0) {
    return new Set<string>();
  }

  const acceptedProblems = await db
    .select({ pid: luoguAcceptedProblem.pid })
    .from(luoguAcceptedProblem)
    .where(
      and(
        eq(luoguAcceptedProblem.accountId, input.accountId),
        inArray(luoguAcceptedProblem.pid, input.pids)
      )
    );

  return new Set(acceptedProblems.map((problem) => problem.pid));
};

export const attachAcceptedStatus = async (
  db: Database,
  input: {
    currentUserId: null | string;
    problems: ProblemSetProblemRecord[];
  }
) => {
  const completionSource = await getCurrentLuoguCompletionSource(
    db,
    input.currentUserId
  );

  if (!completionSource) {
    return input.problems.map((problem) => ({
      difficulty: problem.difficulty,
      pid: problem.pid,
      title: problem.title,
      accepted: null,
    }));
  }

  const acceptedPids = await getAcceptedPids(db, {
    accountId: completionSource.accountId,
    pids: input.problems.map((problem) => problem.pid),
  });

  return input.problems.map((problem) => ({
    difficulty: problem.difficulty,
    pid: problem.pid,
    title: problem.title,
    accepted: acceptedPids.has(problem.pid),
  }));
};
