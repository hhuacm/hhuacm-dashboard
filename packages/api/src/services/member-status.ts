import type { MemberStatus } from "@hhuacm-dashboard/domain";

export const publicActivityMemberStatuses = [
  "selection",
  "active",
] as const satisfies readonly MemberStatus[];

export const statsDisabledMemberStatuses = [
  "retired",
  "frozen",
] as const satisfies readonly MemberStatus[];

const publicActivityMemberStatusSet = new Set<MemberStatus>(
  publicActivityMemberStatuses
);
const statsDisabledMemberStatusSet = new Set<MemberStatus>(
  statsDisabledMemberStatuses
);

export const isPublicActivityMemberStatus = (status: MemberStatus) =>
  publicActivityMemberStatusSet.has(status);

export const isStatsDisabledMemberStatus = (status: MemberStatus) =>
  statsDisabledMemberStatusSet.has(status);
