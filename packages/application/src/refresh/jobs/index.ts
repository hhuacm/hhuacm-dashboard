import type { RefreshRequest } from "../request-store";
import { atcoderAccountStatsJob as atcoderAccountStatsJobDefinition } from "./atcoder-account-stats";
import { codeforcesAccountStatsJob as codeforcesAccountStatsJobDefinition } from "./codeforces-account-stats";
import type { RefreshJobDefinition } from "./definition";
import { luoguAccountStatsJob as luoguAccountStatsJobDefinition } from "./luogu-account-stats";
import { luoguProblemDetailsJob as luoguProblemDetailsJobDefinition } from "./luogu-problem-details";
import { nowcoderAccountStatsJob as nowcoderAccountStatsJobDefinition } from "./nowcoder-account-stats";
import { userAwardsFromLuoguJob as userAwardsFromLuoguJobDefinition } from "./user-awards-from-luogu";

export const refreshJobDefinitions = [
  atcoderAccountStatsJobDefinition,
  codeforcesAccountStatsJobDefinition,
  luoguAccountStatsJobDefinition,
  luoguProblemDetailsJobDefinition,
  nowcoderAccountStatsJobDefinition,
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
