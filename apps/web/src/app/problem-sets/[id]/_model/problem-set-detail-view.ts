import type { AppRouter } from "@hhuacm-dashboard/api/routers/index";
import {
  type CurrentMemberStatus,
  getUserNameLabel,
} from "@hhuacm-dashboard/domain";
import type { inferRouterOutputs } from "@trpc/server";

type RouterOutputs = inferRouterOutputs<AppRouter>;

export type ProblemSetProblem =
  RouterOutputs["problemSet"]["get"]["problems"][number];
export type ProblemSetCompletion =
  RouterOutputs["problemSet"]["completions"][number];

export interface CompletionGradeOption {
  label: string;
  value: string;
}

export interface CompletionRowFilters {
  minCompletedCount?: number;
  selectedGrades: string[];
  selectedMemberStatuses: CurrentMemberStatus[];
}

export const emptyCompletionGradeFilterValue = "__empty_completion_grade__";

export const luoguDifficultyClassNames = [
  "bg-[rgb(191,191,191)] text-[#333333]",
  "bg-[rgb(254,76,97)] text-white",
  "bg-[rgb(243,156,17)] text-white",
  "bg-[rgb(255,193,22)] text-[#713f12]",
  "bg-[rgb(83,196,26)] text-white",
  "bg-[rgb(52,152,219)] text-white",
  "bg-[rgb(156,61,207)] text-white",
  "bg-[rgb(14,29,105)] text-white",
] as const;

export const luoguDifficultyLabels = [
  "暂无评定",
  "入门",
  "普及-",
  "普及/提高-",
  "普及+/提高",
  "提高+/省选-",
  "省选/NOI-",
  "NOI/NOI+/CTSC",
] as const;

export const problemTableColumnClassNames = {
  index: "w-10 whitespace-nowrap text-center",
  status: "w-24 whitespace-nowrap text-center",
} as const;

const getPidColumnWidthClassName = (maxPidLength: number) => {
  if (maxPidLength > 7) {
    return "w-24";
  }

  if (maxPidLength > 5) {
    return "w-[5.5rem]";
  }

  return "w-20";
};

export const getPidColumnClassName = (problems: ProblemSetProblem[]) => {
  const maxPidLength = Math.max(
    0,
    ...problems.map((problem) => problem.pid.length)
  );
  const widthClassName = getPidColumnWidthClassName(maxPidLength);

  return `${widthClassName} whitespace-nowrap px-3 text-left`;
};

export const getDifficultyLabel = (difficulty: null | number) => {
  if (difficulty === null) {
    return "-";
  }

  return luoguDifficultyLabels[difficulty] ?? `难度 ${difficulty}`;
};

const getDifficultyColumnWidthClassName = (
  maxDifficultyLabelLength: number
) => {
  if (maxDifficultyLabelLength >= luoguDifficultyLabels[7].length) {
    return "w-[8.5rem]";
  }

  if (maxDifficultyLabelLength >= luoguDifficultyLabels[4].length) {
    return "w-28";
  }

  return "w-20";
};

export const getDifficultyColumnClassName = (problems: ProblemSetProblem[]) => {
  const maxDifficultyLabelLength = Math.max(
    0,
    ...problems.map((problem) => getDifficultyLabel(problem.difficulty).length)
  );
  const widthClassName = getDifficultyColumnWidthClassName(
    maxDifficultyLabelLength
  );

  return `${widthClassName} whitespace-nowrap text-center`;
};

export const getLuoguProblemUrl = (pid: string) =>
  `https://www.luogu.com.cn/problem/${pid}`;

export const getProfileUrl = (username: string) =>
  `/profile/${encodeURIComponent(username)}`;

export const getProgressText = (problems: ProblemSetProblem[]) => {
  const hasAcceptedStatus = problems.some(
    (problem) => problem.accepted !== null
  );

  if (!hasAcceptedStatus) {
    return null;
  }

  const completedCount = problems.filter(
    (problem) => problem.accepted === true
  ).length;

  return {
    completedCount,
    totalCount: problems.length,
  };
};

export const sortCompletionRows = (rows: ProblemSetCompletion[]) =>
  rows.toSorted((left, right) => {
    if (left.completedProblemCount !== right.completedProblemCount) {
      return right.completedProblemCount - left.completedProblemCount;
    }

    const nameLabelOrder = getUserNameLabel(left).localeCompare(
      getUserNameLabel(right),
      "zh-CN"
    );

    if (nameLabelOrder !== 0) {
      return nameLabelOrder;
    }

    return left.userId.localeCompare(right.userId);
  });

const getCompletionGradeFilterValue = (grade: null | string) =>
  grade ?? emptyCompletionGradeFilterValue;

const getCompletionGradeOption = (value: string): CompletionGradeOption => ({
  label: value === emptyCompletionGradeFilterValue ? "未填写" : value,
  value,
});

const compareCompletionGradeOptions = (
  left: CompletionGradeOption,
  right: CompletionGradeOption
) => {
  if (left.value === emptyCompletionGradeFilterValue) {
    return 1;
  }

  if (right.value === emptyCompletionGradeFilterValue) {
    return -1;
  }

  return right.label.localeCompare(left.label, "zh-CN", {
    numeric: true,
  });
};

export const getCompletionGradeOptions = (
  rows: ProblemSetCompletion[]
): CompletionGradeOption[] =>
  [...new Set(rows.map((row) => getCompletionGradeFilterValue(row.grade)))]
    .map(getCompletionGradeOption)
    .sort(compareCompletionGradeOptions);

export const filterCompletionRows = (
  rows: ProblemSetCompletion[],
  filters: CompletionRowFilters
) => {
  const selectedGradeSet = new Set(filters.selectedGrades);
  const selectedMemberStatusSet = new Set(filters.selectedMemberStatuses);
  const hasGradeFilter = selectedGradeSet.size > 0;
  const hasMemberStatusFilter = selectedMemberStatusSet.size > 0;
  const minCompletedCount = filters.minCompletedCount;

  return rows.filter((row) => {
    if (
      minCompletedCount !== undefined &&
      row.completedProblemCount < minCompletedCount
    ) {
      return false;
    }

    if (
      hasGradeFilter &&
      !selectedGradeSet.has(getCompletionGradeFilterValue(row.grade))
    ) {
      return false;
    }

    if (
      hasMemberStatusFilter &&
      !selectedMemberStatusSet.has(row.memberStatus)
    ) {
      return false;
    }

    return true;
  });
};
