import type { RefreshRequest } from "../request-store";
import { codeforcesAccountStatsJob as codeforcesAccountStatsJobDefinition } from "./codeforces-account-stats";
import type { RefreshJobDefinition } from "./definition";
import { luoguAccountStatsJob as luoguAccountStatsJobDefinition } from "./luogu-account-stats";
import { luoguProblemDetailsJob as luoguProblemDetailsJobDefinition } from "./luogu-problem-details";
import { userAwardsFromLuoguJob as userAwardsFromLuoguJobDefinition } from "./user-awards-from-luogu";

export const refreshJobDefinitions = [
  codeforcesAccountStatsJobDefinition,
  luoguAccountStatsJobDefinition,
  luoguProblemDetailsJobDefinition,
  userAwardsFromLuoguJobDefinition,
] as const satisfies readonly RefreshJobDefinition[];

export const findRefreshJobDefinition = (
  definitions: readonly RefreshJobDefinition[],
  kind: RefreshRequest["kind"]
) => {
  const definition = definitions.find((item) => item.kind === kind);

  if (!definition) {
    throw new Error(`Unsupported refresh request kind: ${kind}`);
  }

  return definition;
};
