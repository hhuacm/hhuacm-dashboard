import type { Database } from "@hhuacm-dashboard/db";
import {
  luoguAcceptedProblem,
  luoguAccountStats,
} from "@hhuacm-dashboard/db/schema/luogu-account-stats";
import { userOjAccount } from "@hhuacm-dashboard/db/schema/oj-account";
import { and, eq, inArray } from "drizzle-orm";
import { ensureLuoguAccountStatsRefresh } from "../../refresh/ensure";

interface ProblemSetProblemForCompletion {
  difficulty: null | number;
  pid: string;
  title: string;
}

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

const ensureLuoguStatsRefresh = async (
  db: Database,
  account: Awaited<ReturnType<typeof getCurrentLuoguAccount>>
) => {
  if (!account) {
    return;
  }

  await ensureLuoguAccountStatsRefresh(db, {
    accountId: account.accountId,
    fetchedAt: account.fetchedAt,
    now: new Date(),
  });
};

export const getCurrentLuoguCompletionSource = async (
  db: Database,
  currentUserId: null | string
) => {
  const currentLuoguAccount = await getCurrentLuoguAccount(db, currentUserId);

  await ensureLuoguStatsRefresh(db, currentLuoguAccount);

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
    problems: ProblemSetProblemForCompletion[];
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
