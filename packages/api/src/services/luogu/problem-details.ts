import { problemSetProblem } from "@hhuacm-dashboard/db/schema/problem-set";
import { eq } from "drizzle-orm";

import type { Context } from "../../context";
import { luoguSource } from "../../external/online-judge-sources/luogu/api";

type Database = Context["db"];
export type LuoguProblemLoader = typeof luoguSource.problem;

interface LuoguProblemDetails {
  difficulty: null | number;
  pid: string;
  title: string;
}

export const findLuoguProblemDetails = async (
  pid: string,
  loadProblem: LuoguProblemLoader = luoguSource.problem
): Promise<LuoguProblemDetails> => {
  const problemData = await loadProblem({ pid });
  const problem = problemData.problem;

  return {
    difficulty: problem.difficulty,
    pid: problem.pid,
    title: problem.name,
  };
};

export const enrichProblemSetProblemsByPid = async (
  db: Database,
  pid: string,
  loadProblem: LuoguProblemLoader = luoguSource.problem
) => {
  const [referencedProblem] = await db
    .select({ pid: problemSetProblem.pid })
    .from(problemSetProblem)
    .where(eq(problemSetProblem.pid, pid))
    .limit(1);

  if (!referencedProblem) {
    return "unused" as const;
  }

  const details = await findLuoguProblemDetails(pid, loadProblem);

  await db
    .update(problemSetProblem)
    .set({
      difficulty: details.difficulty,
      title: details.title,
    })
    .where(eq(problemSetProblem.pid, pid));

  return "updated" as const;
};
