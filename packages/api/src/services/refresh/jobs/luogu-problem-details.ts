import type { Context } from "../../../context";
import {
  enrichProblemSetProblemsByPid,
  type LuoguProblemListLoader,
} from "../../luogu/problem-details";
import { luoguProblemDetailsJobKind, refreshDefaults } from "../constants";
import type { RefreshJobDefinition } from "../runtime";

type Database = Context["db"];

export const handleLuoguProblemDetailsJob = async (
  db: Database,
  job: Parameters<RefreshJobDefinition["handle"]>[1],
  loadProblemList?: LuoguProblemListLoader
) => {
  try {
    await enrichProblemSetProblemsByPid(db, job.targetId, loadProblemList);

    return;
  } catch {
    return { requeue: true };
  }
};

export const luoguProblemDetailsRefreshJobDefinition = {
  cooldownMs: refreshDefaults.jobCooldownMs,
  handle: handleLuoguProblemDetailsJob,
  kind: luoguProblemDetailsJobKind,
  scanStaleTargets: async () => 0,
} as const satisfies RefreshJobDefinition;
