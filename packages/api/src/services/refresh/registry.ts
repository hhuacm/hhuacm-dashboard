import type { Context } from "../../context";
import type { RefreshJob } from "./job-store";
import { codeforcesAccountStatsRefreshJobDefinition } from "./jobs/codeforces-account-stats";
import { luoguAccountStatsRefreshJobDefinition } from "./jobs/luogu-account-stats";
import { luoguProblemDetailsRefreshJobDefinition } from "./jobs/luogu-problem-details";
import { userAwardsFromLuoguRefreshJobDefinition } from "./jobs/user-awards-from-luogu";

type Database = Context["db"];

export interface RefreshJobDefinition {
  handle: (db: Database, job: RefreshJob) => Promise<void>;
  kind: RefreshJob["kind"];
  scanStaleTargets?: (db: Database, now: Date) => Promise<number>;
}

export const refreshJobDefinitions = [
  codeforcesAccountStatsRefreshJobDefinition,
  luoguAccountStatsRefreshJobDefinition,
  luoguProblemDetailsRefreshJobDefinition,
  userAwardsFromLuoguRefreshJobDefinition,
] as const satisfies RefreshJobDefinition[];

export const findRefreshJobDefinition = (
  definitions: RefreshJobDefinition[],
  kind: RefreshJob["kind"]
) => {
  const definition = definitions.find((item) => item.kind === kind);

  if (!definition) {
    throw new Error(`Unsupported refresh job kind: ${kind}`);
  }

  return definition;
};
