import type { Database } from "@hhuacm-dashboard/db";
import { problemSet } from "@hhuacm-dashboard/db/schema/problem-set";
import { eq } from "drizzle-orm";
import { ApplicationError } from "../../errors";
import { enqueueLuoguProblemDetailsJobs } from "../../refresh/jobs/luogu-problem-details";
import {
  normalizeProblemPids,
  replaceProblemSetProblems,
} from "./problem-list";
import { getProblemSet, getProblemSetOrThrow } from "./query";

interface ProblemSetInput {
  descriptionMarkdown: string;
  pids: string[];
  title: string;
}

interface ProblemSetUpdateInput {
  descriptionMarkdown?: string;
  id: string;
  pids?: string[];
  title?: string;
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
    const [createdProblemSet] = await tx
      .insert(problemSet)
      .values({
        descriptionMarkdown: input.descriptionMarkdown,
        title: input.title,
      })
      .returning(problemSetFields);

    if (!createdProblemSet) {
      throw new ApplicationError({ code: "INTERNAL_SERVER_ERROR" });
    }

    await replaceProblemSetProblems(tx, {
      pids,
      problemSetId: createdProblemSet.id,
    });

    return createdProblemSet;
  });

  await enqueueLuoguProblemDetailsJobs(db, pids);

  return await getProblemSet(db, {
    currentUserId: null,
    id: item.id,
  });
};

export const updateProblemSet = async (
  db: Database,
  input: ProblemSetUpdateInput
) => {
  await getProblemSetOrThrow(db, input.id);
  const pids =
    input.pids === undefined ? null : normalizeProblemPids(input.pids);

  await db.transaction(async (tx) => {
    const values = {
      ...(input.descriptionMarkdown === undefined
        ? {}
        : { descriptionMarkdown: input.descriptionMarkdown }),
      ...(input.title === undefined ? {} : { title: input.title }),
      ...(input.descriptionMarkdown === undefined &&
      input.pids === undefined &&
      input.title === undefined
        ? {}
        : { updatedAt: new Date() }),
    };

    if (Object.keys(values).length > 0) {
      await tx
        .update(problemSet)
        .set(values)
        .where(eq(problemSet.id, input.id));
    }

    if (pids !== null) {
      await replaceProblemSetProblems(tx, {
        pids,
        problemSetId: input.id,
      });
    }
  });

  if (pids !== null) {
    await enqueueLuoguProblemDetailsJobs(db, pids);
  }

  return await getProblemSet(db, {
    currentUserId: null,
    id: input.id,
  });
};

export const deleteProblemSet = async (db: Database, id: string) => {
  await getProblemSetOrThrow(db, id);
  await db.delete(problemSet).where(eq(problemSet.id, id));

  return { id };
};
