export const memberStatuses = [
  "selection",
  "active",
  "retired",
  "frozen",
] as const;

export type MemberStatus = (typeof memberStatuses)[number];

export const defaultMemberStatus = memberStatuses[0];

const memberStatusSet = new Set<string>(memberStatuses);

export const isMemberStatus = (value: unknown): value is MemberStatus =>
  typeof value === "string" && memberStatusSet.has(value);

export const currentMemberStatuses = [
  "selection",
  "active",
] as const satisfies readonly MemberStatus[];

export type CurrentMemberStatus = (typeof currentMemberStatuses)[number];

const currentMemberStatusSet = new Set<string>(currentMemberStatuses);

export const isCurrentMemberStatus = (
  value: unknown
): value is CurrentMemberStatus =>
  typeof value === "string" && currentMemberStatusSet.has(value);

export type StatsDisabledMemberStatus = Exclude<
  MemberStatus,
  CurrentMemberStatus
>;

export const statsDisabledMemberStatuses: readonly StatsDisabledMemberStatus[] =
  memberStatuses.filter(
    (status): status is StatsDisabledMemberStatus =>
      !isCurrentMemberStatus(status)
  );

const statsDisabledMemberStatusSet = new Set<string>(
  statsDisabledMemberStatuses
);

export const isStatsDisabledMemberStatus = (
  value: unknown
): value is StatsDisabledMemberStatus =>
  typeof value === "string" && statsDisabledMemberStatusSet.has(value);

export const memberStatusLabels = {
  active: "服役中",
  frozen: "已冻结",
  retired: "已退役",
  selection: "选拔中",
} as const satisfies Record<MemberStatus, string>;

const unnamedUserLabel = "未命名用户";

const normalizeUserNamePart = (value: null | string | undefined) => {
  const normalizedValue = value?.trim();

  return normalizedValue ? normalizedValue : null;
};

export const getUserNameLabel = (user: {
  realName?: null | string;
  username: string;
}) =>
  normalizeUserNamePart(user.realName) ??
  normalizeUserNamePart(user.username) ??
  unnamedUserLabel;

export const ojPlatforms = [
  "luogu",
  "codeforces",
  "atcoder",
  "nowcoder",
] as const;

export type OjPlatform = (typeof ojPlatforms)[number];

const ojPlatformSet = new Set<string>(ojPlatforms);

export const isOjPlatform = (value: unknown): value is OjPlatform =>
  typeof value === "string" && ojPlatformSet.has(value);

export const ojPlatformLabels = {
  atcoder: "AtCoder",
  codeforces: "Codeforces",
  luogu: "洛谷",
  nowcoder: "牛客",
} as const satisfies Record<OjPlatform, string>;

export const ojPlatformNames = {
  atcoder: "AtCoder",
  codeforces: "Codeforces",
  luogu: "Luogu",
  nowcoder: "Nowcoder",
} as const satisfies Record<OjPlatform, string>;

export const refreshSyncStatuses = [
  "empty",
  "failed",
  "ready",
  "refreshing",
] as const;

export type RefreshSyncStatus = (typeof refreshSyncStatuses)[number];

const refreshSyncStatusSet = new Set<string>(refreshSyncStatuses);

export const isRefreshSyncStatus = (
  value: unknown
): value is RefreshSyncStatus =>
  typeof value === "string" && refreshSyncStatusSet.has(value);

const gradeOtherOption = "其他";

const gradeLookbackYears = 7;

export const getGradeOptions = (currentDate = new Date()) => {
  const currentYear = currentDate.getFullYear();
  const startYear = currentYear - gradeLookbackYears;
  const yearOptions = Array.from(
    { length: gradeLookbackYears + 1 },
    (_, index) => `${String(startYear + index).slice(-2)}级`
  );

  return [...yearOptions, gradeOtherOption];
};

export const isValidGradeOption = (grade: string) =>
  getGradeOptions().includes(grade);

export const getGradeOptionsWithCurrentValue = (
  currentValue: string,
  currentDate = new Date()
) => {
  const options = getGradeOptions(currentDate);

  if (!currentValue || options.includes(currentValue)) {
    return options;
  }

  return [currentValue, ...options];
};
