import type { AppRouter } from "@hhuacm-dashboard/api/routers/index";
import {
  isMemberStatus,
  isOjPlatform,
  type MemberStatus,
  memberStatuses,
  memberStatusLabels,
  type OjPlatform,
  ojPlatformLabels,
  ojPlatforms,
} from "@hhuacm-dashboard/domain";
import type { inferRouterOutputs } from "@trpc/server";

import {
  buildProfileFormValues,
  getChangedProfileValues,
  hasProfileUpdateValues,
  type ProfileFormValues,
  type ProfileUpdateValues,
} from "@/utils/profile-fields";

const sortableColumns = [
  "email",
  "grade",
  "major",
  "memberStatus",
  "realName",
  "studentId",
  "username",
] as const;

type RouterOutputs = inferRouterOutputs<AppRouter>;
type AdminUsersRouter = RouterOutputs["admin"]["users"];

export type SortColumn = (typeof sortableColumns)[number];
export type SortDirection = "ascending" | "descending";
export type AdminUserTableRow = AdminUsersRouter["list"][number];
export type UserRole = AdminUserTableRow["role"];

export interface FilterOption {
  label: string;
  value: string;
}

export interface AdminUsersFilters {
  grades: string[];
  memberStatuses: MemberStatus[];
  ojPlatforms: OjPlatform[];
}

export interface AdminUsersSort {
  column: SortColumn;
  direction: SortDirection;
}

export type AdminUserOjAccount = AdminUserTableRow["ojAccounts"][number];

export interface AdminUsersFilterOptions {
  grades: FilterOption[];
  memberStatuses: FilterOption[];
  ojPlatforms: FilterOption[];
}

export type AdminProfileFormValues = ProfileFormValues & {
  memberStatus: MemberStatus;
};

export type AdminProfileUpdateValues = ProfileUpdateValues & {
  memberStatus?: MemberStatus;
};

export const emptyAdminUsersFilters: AdminUsersFilters = {
  grades: [],
  memberStatuses: [],
  ojPlatforms: [],
};

export const isMemberStatusFilterValue = (
  value: string
): value is MemberStatus => isMemberStatus(value);

export const isOjPlatformFilterValue = (value: string): value is OjPlatform =>
  isOjPlatform(value);

export const hasFilters = (filters: AdminUsersFilters) =>
  filters.grades.length > 0 ||
  filters.memberStatuses.length > 0 ||
  filters.ojPlatforms.length > 0;

const textCollator = new Intl.Collator("zh-CN", {
  numeric: true,
  sensitivity: "base",
});

const memberStatusFilterOptions = memberStatuses.map((status) => ({
  label: memberStatusLabels[status],
  value: status,
}));

const ojPlatformFilterOptions = ojPlatforms.map((platform) => ({
  label: ojPlatformLabels[platform],
  value: platform,
}));

export const getAdminUsersFilterOptions = (
  users: AdminUserTableRow[]
): AdminUsersFilterOptions => ({
  grades: [...new Set(users.map((user) => user.grade))]
    .sort((left, right) => textCollator.compare(left, right))
    .map((grade) => ({ label: grade, value: grade })),
  memberStatuses: memberStatusFilterOptions,
  ojPlatforms: ojPlatformFilterOptions,
});

const getSortValue = (user: AdminUserTableRow, column: SortColumn) =>
  user[column];

export const getVisibleAdminUsers = (
  users: AdminUserTableRow[],
  filters: AdminUsersFilters,
  sort: AdminUsersSort
) => {
  const filteredUsers = users.filter(
    (user) =>
      (filters.grades.length === 0 || filters.grades.includes(user.grade)) &&
      (filters.memberStatuses.length === 0 ||
        filters.memberStatuses.includes(user.memberStatus)) &&
      (filters.ojPlatforms.length === 0 ||
        user.ojAccounts.some((account) =>
          filters.ojPlatforms.includes(account.platform)
        ))
  );
  const direction = sort.direction === "ascending" ? 1 : -1;

  return filteredUsers.toSorted((left, right) => {
    const comparison = textCollator.compare(
      getSortValue(left, sort.column),
      getSortValue(right, sort.column)
    );

    return comparison === 0
      ? textCollator.compare(left.id, right.id)
      : comparison * direction;
  });
};

const getErrorText = (error: unknown) => {
  if (typeof error !== "object" || error === null || !("message" in error)) {
    return "";
  }

  const message = Reflect.get(error, "message");

  return typeof message === "string" ? message : "";
};

export const getAdminEditErrorMessage = (error: unknown) => {
  const errorText = getErrorText(error);

  if (errorText.includes("OJ external ID already exists")) {
    return "该平台账号标识已被其他用户登记。";
  }

  if (errorText.includes("OJ account does not exist")) {
    return "该平台尚未登记。";
  }

  if (errorText.includes("User does not exist")) {
    return "用户不存在，请刷新列表后重试。";
  }

  if (errorText.includes("Admin users cannot be deleted")) {
    return "管理员账户不能在面板删除。";
  }

  if (errorText.includes("Only frozen users can be deleted")) {
    return "只有已冻结用户才能删除。";
  }

  if (errorText.includes("Username confirmation does not match")) {
    return "用户名确认不匹配。";
  }

  if (errorText.includes("Invalid grade")) {
    return "年级不在可选范围内。";
  }

  return "操作失败，请稍后再试。";
};

export const buildAdminProfileFormValues = (
  user: AdminUserTableRow
): AdminProfileFormValues => ({
  ...buildProfileFormValues(user),
  memberStatus: user.memberStatus,
});

export const getChangedAdminProfileValues = (
  currentValues: AdminProfileFormValues,
  originalValues: AdminProfileFormValues
) => {
  const changedValues: AdminProfileUpdateValues = {
    ...getChangedProfileValues(currentValues, originalValues),
  };

  if (currentValues.memberStatus !== originalValues.memberStatus) {
    changedValues.memberStatus = currentValues.memberStatus;
  }

  return changedValues;
};

export const hasAdminProfileUpdateValues = (values: AdminProfileUpdateValues) =>
  "memberStatus" in values || hasProfileUpdateValues(values);

export const getOjAccountByPlatform = (
  accounts: AdminUserOjAccount[],
  platform: OjPlatform
) => accounts.find((account) => account.platform === platform);
