import { currentMember } from "@hhuacm-dashboard/db/schema/current-member";
import { luoguAcceptedProblem } from "@hhuacm-dashboard/db/schema/luogu-account-stats";
import { userOjAccount } from "@hhuacm-dashboard/db/schema/oj-account";
import {
  problemSet,
  problemSetProblem,
} from "@hhuacm-dashboard/db/schema/problem-set";
import { TRPCError } from "@trpc/server";
import { and, asc, count, eq } from "drizzle-orm";

import type { Context } from "../../context";
import { enqueueLuoguProblemDetailsJobs } from "../refresh/jobs/luogu-problem-details";
import {
  attachAcceptedStatus,
  getCurrentLuoguCompletionSource,
} from "./completion";

type Database = Context["db"];

const problemSetFields = {
  createdAt: problemSet.createdAt,
  descriptionMarkdown: problemSet.descriptionMarkdown,
  id: problemSet.id,
  title: problemSet.title,
  updatedAt: problemSet.updatedAt,
} as const;

const problemSetProblemFields = {
  difficulty: problemSetProblem.difficulty,
  pid: problemSetProblem.pid,
  sortOrder: problemSetProblem.sortOrder,
  title: problemSetProblem.title,
} as const;

const toIsoString = (date: Date) => date.toISOString();

export const getProblemSetOrThrow = async (db: Database, id: string) => {
  const [item] = await db
    .select(problemSetFields)
    .from(problemSet)
    .where(eq(problemSet.id, id))
    .limit(1);

  if (!item) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: `Problem set does not exist: ${id}`,
    });
  }

  return item;
};

const getProblemSetProblems = (db: Database, problemSetId: string) =>
  db
    .select(problemSetProblemFields)
    .from(problemSetProblem)
    .where(eq(problemSetProblem.problemSetId, problemSetId))
    .orderBy(asc(problemSetProblem.sortOrder));

const toPublicProblemSetProblem = (
  problem: Awaited<ReturnType<typeof getProblemSetProblems>>[number]
) => ({
  difficulty: problem.difficulty,
  pid: problem.pid,
  title: problem.title ?? problem.pid,
});

const requestMissingProblemDetailsRefreshes = async (
  db: Database,
  problems: Awaited<ReturnType<typeof getProblemSetProblems>>
) => {
  const missingDetailPids = problems
    .filter((problem) => problem.title === null || problem.difficulty === null)
    .map((problem) => problem.pid);

  await enqueueLuoguProblemDetailsJobs(db, missingDetailPids);
};

export const listProblemSets = async (
  db: Database,
  input: { currentUserId: null | string }
) => {
  const rows = await db
    .select({
      createdAt: problemSet.createdAt,
      descriptionMarkdown: problemSet.descriptionMarkdown,
      id: problemSet.id,
      problemCount: count(problemSetProblem.pid),
      title: problemSet.title,
      updatedAt: problemSet.updatedAt,
    })
    .from(problemSet)
    .leftJoin(
      problemSetProblem,
      eq(problemSetProblem.problemSetId, problemSet.id)
    )
    .groupBy(problemSet.id)
    .orderBy(asc(problemSet.createdAt), asc(problemSet.id));

  const completionSource = await getCurrentLuoguCompletionSource(
    db,
    input.currentUserId
  );

  if (!completionSource) {
    return rows.map((row) => ({
      completedProblemCount: null,
      createdAt: toIsoString(row.createdAt),
      descriptionMarkdown: row.descriptionMarkdown,
      id: row.id,
      problemCount: row.problemCount,
      title: row.title,
      updatedAt: toIsoString(row.updatedAt),
    }));
  }

  const acceptedRows = await db
    .select({
      problemSetId: problemSetProblem.problemSetId,
    })
    .from(problemSetProblem)
    .innerJoin(
      luoguAcceptedProblem,
      and(
        eq(luoguAcceptedProblem.pid, problemSetProblem.pid),
        eq(luoguAcceptedProblem.accountId, completionSource.accountId)
      )
    );
  const completedCounts = new Map<string, number>();

  for (const row of acceptedRows) {
    completedCounts.set(
      row.problemSetId,
      (completedCounts.get(row.problemSetId) ?? 0) + 1
    );
  }

  return rows.map((row) => ({
    completedProblemCount: completedCounts.get(row.id) ?? 0,
    createdAt: toIsoString(row.createdAt),
    descriptionMarkdown: row.descriptionMarkdown,
    id: row.id,
    problemCount: row.problemCount,
    title: row.title,
    updatedAt: toIsoString(row.updatedAt),
  }));
};

export const getProblemSet = async (
  db: Database,
  input: { currentUserId: null | string; id: string }
) => {
  const item = await getProblemSetOrThrow(db, input.id);
  const problems = await getProblemSetProblems(db, input.id);
  await requestMissingProblemDetailsRefreshes(db, problems);
  const publicProblems = await attachAcceptedStatus(db, {
    currentUserId: input.currentUserId,
    problems: problems.map(toPublicProblemSetProblem),
  });

  return {
    createdAt: toIsoString(item.createdAt),
    descriptionMarkdown: item.descriptionMarkdown,
    id: item.id,
    problems: publicProblems,
    title: item.title,
    updatedAt: toIsoString(item.updatedAt),
  };
};

export const listProblemSetCompletions = async (db: Database, id: string) => {
  await getProblemSetOrThrow(db, id);

  const rows = await db
    .select({
      completedProblemCount: count(luoguAcceptedProblem.pid),
      grade: currentMember.grade,
      realName: currentMember.realName,
      userId: currentMember.userId,
      username: currentMember.username,
    })
    .from(problemSetProblem)
    .innerJoin(
      luoguAcceptedProblem,
      eq(luoguAcceptedProblem.pid, problemSetProblem.pid)
    )
    .innerJoin(
      userOjAccount,
      and(
        eq(userOjAccount.id, luoguAcceptedProblem.accountId),
        eq(userOjAccount.platform, "luogu")
      )
    )
    .innerJoin(currentMember, eq(currentMember.userId, userOjAccount.userId))
    .where(eq(problemSetProblem.problemSetId, id))
    .groupBy(
      currentMember.userId,
      currentMember.username,
      currentMember.grade,
      currentMember.realName
    );

  return rows
    .filter((row) => row.completedProblemCount > 0)
    .map((row) => ({
      completedProblemCount: row.completedProblemCount,
      grade: row.grade,
      realName: row.realName,
      userId: row.userId,
      username: row.username,
    }));
};
