export const memberStatuses = [
  "selection",
  "active",
  "retired",
  "frozen",
] as const;

export type MemberStatus = (typeof memberStatuses)[number];

export const defaultMemberStatus = memberStatuses[0];

export const memberStatusLabels = {
  active: "服役中",
  frozen: "已冻结",
  retired: "已退役",
  selection: "选拔中",
} as const satisfies Record<MemberStatus, string>;

export const ojPlatforms = [
  "luogu",
  "codeforces",
  "atcoder",
  "nowcoder",
] as const;

export type OjPlatform = (typeof ojPlatforms)[number];

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

export const gradeOtherOption = "其他";

const gradeLookbackYears = 7;

export const getGradeOptions = (currentDate = new Date()) => {
  const currentYear = currentDate.getFullYear();
  const startYear = currentYear - gradeLookbackYears;
  const yearOptions = Array.from(
    { length: gradeLookbackYears + 1 },
    (_, index) => `${startYear + index}级`
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
