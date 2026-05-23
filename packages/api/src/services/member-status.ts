import type { MemberStatus } from "@hhuacm-dashboard/domain";

export const statsDisabledMemberStatuses = [
  "retired",
  "frozen",
] as const satisfies readonly MemberStatus[];

const statsDisabledMemberStatusSet = new Set<MemberStatus>(
  statsDisabledMemberStatuses
);

export const isStatsDisabledMemberStatus = (status: MemberStatus) =>
  statsDisabledMemberStatusSet.has(status);
