import { problemSetProblem } from "@hhuacm-dashboard/db/schema/problem-set";
import { eq } from "drizzle-orm";

import type { Context } from "../../context";
import { luoguSource } from "../../external/online-judge-sources/luogu/api";

type Database = Context["db"];
export type LuoguProblemListLoader = typeof luoguSource.problemList;

export interface LuoguProblemDetails {
  difficulty: null | number;
  pid: string;
  title: string;
}

export const findLuoguProblemDetails = async (
  pid: string,
  loadProblemList: LuoguProblemListLoader = luoguSource.problemList
): Promise<LuoguProblemDetails> => {
  const problemList = await loadProblemList({ keyword: pid });
  const problem = problemList.problems.result.find((item) => item.pid === pid);

  if (!problem) {
    throw new Error(`Luogu problem does not exist: ${pid}`);
  }

  return {
    difficulty: problem.difficulty,
    pid: problem.pid,
    title: problem.name,
  };
};

export const enrichProblemSetProblemsByPid = async (
  db: Database,
  pid: string,
  loadProblemList: LuoguProblemListLoader = luoguSource.problemList
) => {
  const [referencedProblem] = await db
    .select({ id: problemSetProblem.id })
    .from(problemSetProblem)
    .where(eq(problemSetProblem.pid, pid))
    .limit(1);

  if (!referencedProblem) {
    return "unused" as const;
  }

  const details = await findLuoguProblemDetails(pid, loadProblemList);

  await db
    .update(problemSetProblem)
    .set({
      difficulty: details.difficulty,
      title: details.title,
      updatedAt: new Date(),
    })
    .where(eq(problemSetProblem.pid, pid));

  return "updated" as const;
};
