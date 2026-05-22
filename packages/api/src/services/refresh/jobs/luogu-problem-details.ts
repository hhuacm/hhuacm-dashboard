import type { Context } from "../../../context";
import {
  enrichProblemSetProblemsByPid,
  type LuoguProblemLoader,
} from "../../luogu/problem-details";
import type { RefreshRequestDefinition } from "../registry";
import { luoguProblemDetailsRequestKind } from "../request-types";

type Database = Context["db"];

export const handleLuoguProblemDetailsRequest = async (
  db: Database,
  request: Parameters<RefreshRequestDefinition["handle"]>[1],
  loadProblem?: LuoguProblemLoader
) => {
  await enrichProblemSetProblemsByPid(db, request.targetId, loadProblem);
};

export const luoguProblemDetailsRefreshRequestDefinition = {
  handle: handleLuoguProblemDetailsRequest,
  kind: luoguProblemDetailsRequestKind,
} as const satisfies RefreshRequestDefinition;
