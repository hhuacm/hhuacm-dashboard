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
import { asc, eq, sql } from "drizzle-orm";

import type { Database } from "./types";

export const problemSetFields = {
  createdAt: problemSet.createdAt,
  descriptionMarkdown: problemSet.descriptionMarkdown,
  id: problemSet.id,
  title: problemSet.title,
  updatedAt: problemSet.updatedAt,
} as const;

export const problemSetProblemFields = {
  difficulty: problemSetProblem.difficulty,
  id: problemSetProblem.id,
  pid: problemSetProblem.pid,
  sortOrder: problemSetProblem.sortOrder,
  title: problemSetProblem.title,
} as const;

export const memberStatusExpression = sql<MemberStatus>`coalesce(${userProfile.memberStatus}, ${defaultMemberStatus})`;

export const toIsoString = (date: Date) => date.toISOString();

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

export const getProblemSetProblems = (db: Database, problemSetId: string) =>
  db
    .select(problemSetProblemFields)
    .from(problemSetProblem)
    .where(eq(problemSetProblem.problemSetId, problemSetId))
    .orderBy(asc(problemSetProblem.sortOrder));

export type ProblemSetProblemRecord = Awaited<
  ReturnType<typeof getProblemSetProblems>
>[number];
