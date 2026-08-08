import type { Database } from "@hhuacm-dashboard/db";
import { problemSet } from "@hhuacm-dashboard/db/schema/problem-set";
import { eq } from "drizzle-orm";
import { ApplicationError } from "../../errors";
import { enqueueLuoguProblemDetailsJobs } from "../../refresh/jobs/luogu-problem-details";
import {
  normalizeProblemPids,
  replaceProblemSetProblems,
} from "./problem-list";
import { getProblemSet } from "./query";

interface ProblemSetInput {
  descriptionMarkdown: string;
  pids: string[];
  title: string;
}

interface ProblemSetUpdateInput extends ProblemSetInput {
  id: string;
}

const problemSetFields = {
  createdAt: problemSet.createdAt,
  descriptionMarkdown: problemSet.descriptionMarkdown,
  id: problemSet.id,
  title: problemSet.title,
  updatedAt: problemSet.updatedAt,
} as const;

export const createProblemSet = async (
  db: Database,
  input: ProblemSetInput
) => {
  const pids = normalizeProblemPids(input.pids);
  const item = await db.transaction(async (tx) => {
    const createdProblemSet = await tx
      .insert(problemSet)
      .values({
        descriptionMarkdown: input.descriptionMarkdown,
        title: input.title,
      })
      .returning(problemSetFields)
      .get();

    await replaceProblemSetProblems(tx, {
      pids,
      problemSetId: createdProblemSet.id,
    });
    await enqueueLuoguProblemDetailsJobs(tx, pids);

    return createdProblemSet;
  });

  return await getProblemSet(db, {
    currentUserId: null,
    id: item.id,
  });
};

export const updateProblemSet = async (
  db: Database,
  input: ProblemSetUpdateInput
) => {
  const pids = normalizeProblemPids(input.pids);

  await db.transaction(async (tx) => {
    const updatedProblemSet = await tx
      .update(problemSet)
      .set({
        descriptionMarkdown: input.descriptionMarkdown,
        title: input.title,
        updatedAt: new Date(),
      })
      .where(eq(problemSet.id, input.id))
      .returning({ id: problemSet.id })
      .get();

    if (!updatedProblemSet) {
      throw new ApplicationError({ code: "NOT_FOUND" });
    }

    await replaceProblemSetProblems(tx, {
      pids,
      problemSetId: input.id,
    });
    await enqueueLuoguProblemDetailsJobs(tx, pids);
  });

  return await getProblemSet(db, {
    currentUserId: null,
    id: input.id,
  });
};

export const deleteProblemSet = async (db: Database, id: string) => {
  const deletedProblemSet = await db
    .delete(problemSet)
    .where(eq(problemSet.id, id))
    .returning({ id: problemSet.id })
    .get();

  if (!deletedProblemSet) {
    throw new ApplicationError({ code: "NOT_FOUND" });
  }

  return deletedProblemSet;
};
