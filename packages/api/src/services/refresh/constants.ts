import type {
  refreshJobKinds,
  refreshJobTargetTypes,
} from "@hhuacm-dashboard/db/schema/refresh-job";

export const codeforcesAccountStatsJobKind = "codeforces.accountStats";
export const ojAccountTargetType = "ojAccount";

export type RefreshJobKind = (typeof refreshJobKinds)[number];
export type RefreshJobTargetType = (typeof refreshJobTargetTypes)[number];

export const refreshDefaults = {
  codeforcesStatsTtlMs: 30 * 60 * 1000,
  jobCooldownMs: 2 * 1000,
  maxErrorLength: 500,
  staleScanIntervalMs: 10 * 60 * 1000,
  workerPollIntervalMs: 5 * 1000,
} as const;
