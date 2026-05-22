import { problemSetProblem } from "@hhuacm-dashboard/db/schema/problem-set";
import { TRPCError } from "@trpc/server";
import { and, eq, inArray } from "drizzle-orm";

import type { Context } from "../../context";

type Database = Context["db"];
type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

const pidPattern = /^[A-Z0-9][A-Z0-9_-]*$/i;

export const normalizeProblemPids = (pids: string[]) => {
  const normalizedPids = pids.map((pid) => pid.trim()).filter(Boolean);
  const seenPids = new Set<string>();

  for (const pid of normalizedPids) {
    if (!pidPattern.test(pid)) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Invalid problem PID: ${pid}`,
      });
    }

    if (seenPids.has(pid)) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Duplicate Luogu PID: ${pid}`,
      });
    }

    seenPids.add(pid);
  }

  if (normalizedPids.length === 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Problem set requires at least one problem",
    });
  }

  return normalizedPids;
};

const getExistingProblemsByPid = async (
  tx: Transaction,
  problemSetId: string,
  pids: string[]
) => {
  if (pids.length === 0) {
    return new Map<string, typeof problemSetProblem.$inferSelect>();
  }

  const existingProblems = await tx
    .select()
    .from(problemSetProblem)
    .where(
      and(
        eq(problemSetProblem.problemSetId, problemSetId),
        inArray(problemSetProblem.pid, pids)
      )
    );

  return new Map(
    existingProblems.map((problem) => [problem.pid, problem] as const)
  );
};

export const replaceProblemSetProblems = async (
  tx: Transaction,
  input: {
    pids: string[];
    problemSetId: string;
  }
) => {
  const existingProblemsByPid = await getExistingProblemsByPid(
    tx,
    input.problemSetId,
    input.pids
  );

  await tx
    .delete(problemSetProblem)
    .where(eq(problemSetProblem.problemSetId, input.problemSetId));

  await tx.insert(problemSetProblem).values(
    input.pids.map((pid, sortOrder) => {
      const existingProblem = existingProblemsByPid.get(pid);

      return {
        difficulty: existingProblem?.difficulty ?? null,
        pid,
        problemSetId: input.problemSetId,
        sortOrder,
        title: existingProblem?.title ?? pid,
      };
    })
  );
};
