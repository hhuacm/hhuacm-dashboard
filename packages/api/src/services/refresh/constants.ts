import type {
  refreshJobKinds,
  refreshJobTargetTypes,
} from "@hhuacm-dashboard/db/schema/refresh-job";

export const codeforcesAccountStatsJobKind = "codeforces.accountStats";
export const luoguAccountStatsJobKind = "luogu.accountStats";
export const luoguProblemDetailsJobKind = "luogu.problemDetails";
export const luoguProblemTargetType = "luoguProblem";
export const ojAccountTargetType = "ojAccount";
export const userAwardsFromLuoguJobKind = "user.awardsFromLuogu";

export type RefreshJobKind = (typeof refreshJobKinds)[number];
export type RefreshJobTargetType = (typeof refreshJobTargetTypes)[number];

export const refreshDefaults = {
  codeforcesStatsTtlMs: 30 * 60 * 1000,
  jobCooldownMs: 2 * 1000,
  luoguStatsTtlMs: 30 * 60 * 1000,
  maxErrorLength: 500,
  staleScanIntervalMs: 10 * 60 * 1000,
  userAwardsTtlMs: 30 * 60 * 1000,
  workerPollIntervalMs: 5 * 1000,
} as const;
