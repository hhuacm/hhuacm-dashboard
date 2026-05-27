import {
  defaultMemberStatus,
  isMemberStatus,
  isOjPlatform,
  type MemberStatus,
  type OjPlatform,
} from "@hhuacm-dashboard/domain";

import {
  buildProfileFormValues,
  getChangedProfileValues,
  hasProfileUpdateValues,
  type ProfileFormValues,
  type ProfileUpdateValues,
} from "@/utils/profile-fields";

export const redirectDelayMs = 3000;

const sortableColumns = [
  "email",
  "grade",
  "major",
  "memberStatus",
  "realName",
  "studentId",
  "username",
] as const;

export type SortColumn = (typeof sortableColumns)[number];
export type SortDirection = "ascending" | "descending";
export type UserRole = "admin" | "user";

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

export interface AdminUserOjAccount {
  handle: string;
  platform: OjPlatform;
  profileUrl: string;
}

export interface AdminUserProfile {
  grade: null | string;
  major: null | string;
  memberStatus: MemberStatus;
  realName: null | string;
  studentId: null | string;
}

export interface AdminUserDetail {
  email: string;
  id: string;
  ojAccounts: AdminUserOjAccount[];
  profile: AdminUserProfile;
  role: UserRole;
  username: string;
}

export interface AdminUserTableRow {
  email: string;
  grade: null | string;
  id: string;
  major: null | string;
  memberStatus: MemberStatus;
  ojAccounts: AdminUserOjAccount[];
  realName: null | string;
  role: UserRole;
  studentId: null | string;
  username: string;
}

export interface AdminUsersMetadata {
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

export const getAdminUsernameLabel = (user: { username: string }) => {
  const username = user.username.trim();

  if (username) {
    return username;
  }

  return "未设置";
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

const getErrorText = (error: unknown) => {
  if (typeof error !== "object" || error === null || !("message" in error)) {
    return "";
  }

  const message = Reflect.get(error, "message");

  return typeof message === "string" ? message : "";
};

export const getAdminEditErrorMessage = (error: unknown) => {
  const errorText = getErrorText(error);

  if (errorText.includes("OJ handle already exists")) {
    return "该平台账号已被其他用户登记。";
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
  profile: AdminUserProfile | undefined
): AdminProfileFormValues => ({
  ...buildProfileFormValues(profile),
  memberStatus: profile?.memberStatus ?? defaultMemberStatus,
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
