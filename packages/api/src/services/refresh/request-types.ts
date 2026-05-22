import type { refreshRequestKinds } from "@hhuacm-dashboard/db/schema/refresh-request";

export type RefreshRequestKind = (typeof refreshRequestKinds)[number];

export const codeforcesAccountStatsRequestKind =
  "codeforces.accountStats" satisfies RefreshRequestKind;
export const luoguAccountStatsRequestKind =
  "luogu.accountStats" satisfies RefreshRequestKind;
export const luoguProblemDetailsRequestKind =
  "luogu.problemDetails" satisfies RefreshRequestKind;
export const userAwardsFromLuoguRequestKind =
  "user.awardsFromLuogu" satisfies RefreshRequestKind;
