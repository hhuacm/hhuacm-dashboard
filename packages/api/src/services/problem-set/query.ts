import { user } from "@hhuacm-dashboard/db/schema/auth";
import { luoguAcceptedProblem } from "@hhuacm-dashboard/db/schema/luogu-account-stats";
import { userOjAccount } from "@hhuacm-dashboard/db/schema/oj-account";
import {
  problemSet,
  problemSetProblem,
} from "@hhuacm-dashboard/db/schema/problem-set";
import { userProfile } from "@hhuacm-dashboard/db/schema/profile";
import {
  defaultMemberStatus,
  type MemberStatus,
} from "@hhuacm-dashboard/domain";
import { TRPCError } from "@trpc/server";
import { and, asc, count, eq, inArray, sql } from "drizzle-orm";

import type { Context } from "../../context";
import { publicActivityMemberStatuses } from "../member-status";
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
  id: problemSetProblem.id,
  pid: problemSetProblem.pid,
  sortOrder: problemSetProblem.sortOrder,
  title: problemSetProblem.title,
} as const;

const memberStatusExpression = sql<MemberStatus>`coalesce(${userProfile.memberStatus}, ${defaultMemberStatus})`;

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

export const listProblemSets = async (
  db: Database,
  input: { currentUserId: null | string }
) => {
  const rows = await db
    .select({
      createdAt: problemSet.createdAt,
      descriptionMarkdown: problemSet.descriptionMarkdown,
      id: problemSet.id,
      problemCount: count(problemSetProblem.id),
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
  const publicProblems = await attachAcceptedStatus(db, {
    currentUserId: input.currentUserId,
    problems,
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
      realName: userProfile.realName,
      userId: user.id,
      username: user.username,
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
    .innerJoin(user, eq(user.id, userOjAccount.userId))
    .leftJoin(userProfile, eq(userProfile.userId, user.id))
    .where(
      and(
        eq(problemSetProblem.problemSetId, id),
        inArray(memberStatusExpression, publicActivityMemberStatuses)
      )
    )
    .groupBy(user.id, user.username, userProfile.realName);

  return rows
    .filter((row) => row.completedProblemCount > 0)
    .map((row) => ({
      completedProblemCount: row.completedProblemCount,
      realName: row.realName,
      userId: row.userId,
      username: row.username,
    }));
};
