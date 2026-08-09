import type { Database } from "@hhuacm-dashboard/db";
import { problemSetProblem } from "@hhuacm-dashboard/db/schema/problem-set";
import { isNull, or } from "drizzle-orm";
import { enrichProblemSetProblemsByPid } from "../../services/luogu/problem-details";
import {
  enqueueRefreshRequest,
  type RefreshQueueDatabase,
} from "../request-store";

export const luoguProblemDetailsRefreshKind = "luogu.problemDetails" as const;

const missingProblemDetailsFields = {
  pid: problemSetProblem.pid,
} as const;

export const handleLuoguProblemDetailsRequest = async (
  db: Database,
  targetId: string
) => {
  await enrichProblemSetProblemsByPid(db, targetId);
};

export const enqueueLuoguProblemDetailsJobs = async (
  db: RefreshQueueDatabase,
  pids: string[]
) => {
  for (const pid of new Set(pids)) {
    await enqueueRefreshRequest(db, {
      kind: luoguProblemDetailsRefreshKind,
      targetId: pid,
    });
  }
};

export const enqueueMissingLuoguProblemDetailsRequests = async (
  db: Database
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
};
