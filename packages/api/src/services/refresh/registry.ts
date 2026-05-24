import type { Context } from "../../context";
import { codeforcesAccountStatsRefreshRequestDefinition } from "./jobs/codeforces-account-stats";
import { luoguAccountStatsRefreshRequestDefinition } from "./jobs/luogu-account-stats";
import { luoguProblemDetailsRefreshRequestDefinition } from "./jobs/luogu-problem-details";
import { userAwardsFromLuoguRefreshRequestDefinition } from "./jobs/user-awards-from-luogu";
import type { RefreshRequest } from "./request-store";

type Database = Context["db"];

export interface RefreshRequestDefinition {
  enqueueDueTargets?: (db: Database, now: Date) => Promise<number>;
  handle: (db: Database, request: RefreshRequest) => Promise<void>;
  kind: RefreshRequest["kind"];
}

export const refreshRequestDefinitions = [
  codeforcesAccountStatsRefreshRequestDefinition,
  luoguAccountStatsRefreshRequestDefinition,
  luoguProblemDetailsRefreshRequestDefinition,
  userAwardsFromLuoguRefreshRequestDefinition,
] as const satisfies RefreshRequestDefinition[];

export const findRefreshRequestDefinition = (
  definitions: RefreshRequestDefinition[],
  kind: RefreshRequest["kind"]
) => {
  const definition = definitions.find((item) => item.kind === kind);

  if (!definition) {
    throw new Error(`Unsupported refresh request kind: ${kind}`);
  }

  return definition;
};
