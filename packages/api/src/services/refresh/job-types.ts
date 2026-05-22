import type { refreshJobKinds } from "@hhuacm-dashboard/db/schema/refresh-job";

export type RefreshJobKind = (typeof refreshJobKinds)[number];

export const codeforcesAccountStatsJobKind =
  "codeforces.accountStats" satisfies RefreshJobKind;
export const luoguAccountStatsJobKind =
  "luogu.accountStats" satisfies RefreshJobKind;
export const luoguProblemDetailsJobKind =
  "luogu.problemDetails" satisfies RefreshJobKind;
export const userAwardsFromLuoguJobKind =
  "user.awardsFromLuogu" satisfies RefreshJobKind;
