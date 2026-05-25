import { problemSetProblem } from "@hhuacm-dashboard/db/schema/problem-set";
import { isNull, or } from "drizzle-orm";

import type { Context } from "../../../context";
import {
  enrichProblemSetProblemsByPid,
  type LuoguProblemLoader,
} from "../../luogu/problem-details";
import { defineRefreshJob, type RefreshJobDefinition } from "./definition";

type Database = Context["db"];

const missingProblemDetailsFields = {
  pid: problemSetProblem.pid,
} as const;

export const handleLuoguProblemDetailsRequest = async (
  db: Database,
  request: Parameters<RefreshJobDefinition["handle"]>[1],
  loadProblem?: LuoguProblemLoader
) => {
  await enrichProblemSetProblemsByPid(db, request.targetId, loadProblem);
};

export const enqueueLuoguProblemDetailsJobs = async (
  db: Database,
  pids: string[]
) => {
  let count = 0;

  for (const pid of new Set(pids)) {
    if (await luoguProblemDetailsJob.enqueue(db, pid)) {
      count += 1;
    }
  }

  return count;
};

const enqueueMissingLuoguProblemDetailsTargets = async (
  db: Database,
  _now: Date
) => {
  const problems = await db
    .selectDistinct(missingProblemDetailsFields)
    .from(problemSetProblem)
    .where(
      or(isNull(problemSetProblem.title), isNull(problemSetProblem.difficulty))
    );

  await enqueueLuoguProblemDetailsJobs(
    db,
    problems.map((problem) => problem.pid)
  );

  return problems.length;
};

export const luoguProblemDetailsJob = defineRefreshJob({
  enqueueDueTargets: enqueueMissingLuoguProblemDetailsTargets,
  handle: handleLuoguProblemDetailsRequest,
  kind: "luogu.problemDetails",
});
