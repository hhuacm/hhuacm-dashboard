import type { Context } from "../../../context";
import {
  enrichProblemSetProblemsByPid,
  type LuoguProblemLoader,
} from "../../luogu/problem-details";
import { luoguProblemDetailsJobKind } from "../job-types";
import type { RefreshJobDefinition } from "../registry";

type Database = Context["db"];

export const handleLuoguProblemDetailsJob = async (
  db: Database,
  job: Parameters<RefreshJobDefinition["handle"]>[1],
  loadProblem?: LuoguProblemLoader
) => {
  await enrichProblemSetProblemsByPid(db, job.targetId, loadProblem);
};

export const luoguProblemDetailsRefreshJobDefinition = {
  handle: handleLuoguProblemDetailsJob,
  kind: luoguProblemDetailsJobKind,
} as const satisfies RefreshJobDefinition;
