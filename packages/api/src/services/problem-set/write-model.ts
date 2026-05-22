import { problemSet } from "@hhuacm-dashboard/db/schema/problem-set";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";

import {
  enqueueProblemDetailsRefreshes,
  normalizeProblemPids,
  replaceProblemSetProblems,
} from "./problem-list";
import { getProblemSet } from "./read-model";
import { getProblemSetOrThrow, problemSetFields } from "./records";
import type { Database, ProblemSetInput, ProblemSetUpdateInput } from "./types";

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
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    }

    await replaceProblemSetProblems(tx, {
      pids,
      problemSetId: createdProblemSet.id,
    });

    return createdProblemSet;
  });

  await enqueueProblemDetailsRefreshes(db, pids);

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
    await enqueueProblemDetailsRefreshes(db, pids);
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
