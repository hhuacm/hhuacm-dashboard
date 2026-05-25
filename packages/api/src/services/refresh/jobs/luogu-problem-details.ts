import { problemSetProblem } from "@hhuacm-dashboard/db/schema/problem-set";
import { isNull, or } from "drizzle-orm";

import type { Context } from "../../../context";
import {
  enrichProblemSetProblemsByPid,
  type LuoguProblemLoader,
} from "../../luogu/problem-details";
import type { RefreshRequestDefinition } from "../registry";
import { luoguProblemDetailsRequestKind } from "../request-types";
import { requestLuoguProblemDetailsRefreshes } from "../requests";

type Database = Context["db"];

const missingProblemDetailsFields = {
  pid: problemSetProblem.pid,
} as const;

export const handleLuoguProblemDetailsRequest = async (
  db: Database,
  request: Parameters<RefreshRequestDefinition["handle"]>[1],
  loadProblem?: LuoguProblemLoader
) => {
  await enrichProblemSetProblemsByPid(db, request.targetId, loadProblem);
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

  await requestLuoguProblemDetailsRefreshes(
    db,
    problems.map((problem) => problem.pid)
  );

  return problems.length;
};

export const luoguProblemDetailsRefreshRequestDefinition = {
  enqueueDueTargets: enqueueMissingLuoguProblemDetailsTargets,
  handle: handleLuoguProblemDetailsRequest,
  kind: luoguProblemDetailsRequestKind,
} as const satisfies RefreshRequestDefinition;
