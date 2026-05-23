import {
  type MemberStatus,
  type OjPlatform,
  ojPlatforms,
} from "@hhuacm-dashboard/domain";
import type { Key } from "react";

import type { TableColumnVisibilityConfig } from "@/components/column-visibility";
import {
  buildProfileFormValues,
  getChangedProfileValues,
  hasProfileUpdateValues,
  type ProfileFormValues,
  type ProfileUpdateValues,
} from "@/utils/profile-fields";

export const redirectDelayMs = 3000;
export const defaultPageSize = 10;
const minPageSize = 5;
const maxPageSize = 80;
const tableRowHeightPx = 56;
const tableReservedHeightPx = 156;
const viewportBottomGapPx = 40;
const compactPaginationLimit = 7;
const paginationNeighborCount = 1;
const adminUsersActionsColumnMinWidth = 112;

export const adminUsersColumnVisibilityStorageKey =
  "admin-users-column-visibility-v1";

const sortableColumns = [
  "email",
  "grade",
  "major",
  "memberStatus",
  "realName",
  "studentId",
  "username",
] as const;

export const memberStatusConfig = {
  active: {
    color: "success",
  },
  frozen: {
    color: "danger",
  },
  retired: {
    color: "default",
  },
  selection: {
    color: "accent",
  },
} as const satisfies Record<
  MemberStatus,
  { color: "accent" | "danger" | "default" | "success" }
>;

export type PageItem = "leading-ellipsis" | "trailing-ellipsis" | number;
export type SortColumn = (typeof sortableColumns)[number];
export type SortDirection = "ascending" | "descending";
export type UserRole = "admin" | "user";
export type AdminUsersColumnId =
  | "email"
  | "grade"
  | "major"
  | "memberStatus"
  | "ojAccounts"
  | "realName"
  | "studentId"
  | "username";

export interface AdminUsersColumnConfig
  extends TableColumnVisibilityConfig<AdminUsersColumnId> {
  cellClassName?: string;
  headerClassName?: string;
  minWidth: number;
}

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
  memberStatus: string;
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

export const clampPageSize = (pageSize: number) =>
  Math.min(maxPageSize, Math.max(minPageSize, pageSize));

export const emptyAdminUsersFilters: AdminUsersFilters = {
  grades: [],
  memberStatuses: [],
  ojPlatforms: [],
};

export const adminUsersColumns = [
  {
    cellClassName: "max-w-48 whitespace-nowrap font-medium",
    defaultVisible: true,
    id: "username",
    label: "用户名",
    minWidth: 192,
  },
  {
    cellClassName: "max-w-72 whitespace-nowrap",
    defaultVisible: true,
    id: "email",
    label: "邮箱",
    minWidth: 256,
  },
  {
    cellClassName: "whitespace-nowrap",
    defaultVisible: true,
    id: "realName",
    label: "姓名",
    minWidth: 128,
  },
  {
    cellClassName: "whitespace-nowrap",
    defaultVisible: false,
    id: "grade",
    label: "年级",
    minWidth: 96,
  },
  {
    cellClassName: "whitespace-nowrap",
    defaultVisible: false,
    id: "studentId",
    label: "学号",
    minWidth: 136,
  },
  {
    cellClassName: "max-w-64 whitespace-nowrap",
    defaultVisible: false,
    id: "major",
    label: "专业",
    minWidth: 176,
  },
  {
    cellClassName: "whitespace-nowrap",
    defaultVisible: true,
    id: "memberStatus",
    label: "状态",
    minWidth: 112,
  },
  {
    cellClassName: "whitespace-nowrap",
    defaultVisible: true,
    id: "ojAccounts",
    label: "OJ 账号",
    minWidth: 220,
  },
] as const satisfies readonly AdminUsersColumnConfig[];

export const getVisibleTableMinWidth = (
  columns: readonly AdminUsersColumnConfig[]
) => {
  let minWidth = 0;

  for (const column of columns) {
    minWidth += column.minWidth;
  }

  return Math.max(720, minWidth + adminUsersActionsColumnMinWidth);
};

export const getFirstVisibleSortColumn = (
  columnIds: readonly AdminUsersColumnId[]
) => {
  for (const columnId of columnIds) {
    if (isSortColumn(columnId)) {
      return columnId;
    }
  }

  return null;
};

export const calculatePageSize = (element: HTMLDivElement | null) => {
  if (!element) {
    return defaultPageSize;
  }

  const { top } = element.getBoundingClientRect();
  const availableHeight =
    window.innerHeight - top - viewportBottomGapPx - tableReservedHeightPx;
  const visibleRows = Math.floor(availableHeight / tableRowHeightPx);

  return clampPageSize(visibleRows);
};

export const getAdminUsernameLabel = (user: { username: string }) => {
  const username = user.username.trim();

  if (username) {
    return username;
  }

  return "未设置";
};

export const isMemberStatus = (status: string): status is MemberStatus =>
  status in memberStatusConfig;

export const isSortColumn = (key: Key): key is SortColumn =>
  typeof key === "string" &&
  sortableColumns.includes(key as (typeof sortableColumns)[number]);

export const isMemberStatusFilterValue = (
  value: string
): value is MemberStatus => value in memberStatusConfig;

export const isOjPlatformFilterValue = (value: string): value is OjPlatform =>
  ojPlatforms.includes(value as OjPlatform);

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
  memberStatus: profile?.memberStatus ?? "selection",
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

export const getPaginationItems = (
  page: number,
  totalPages: number
): PageItem[] => {
  if (totalPages <= compactPaginationLimit) {
    const pages: PageItem[] = [];

    for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
      pages.push(pageNumber);
    }

    return pages;
  }

  const pages: PageItem[] = [1];

  if (page > 3) {
    pages.push("leading-ellipsis");
  }

  const startPage = Math.max(2, page - paginationNeighborCount);
  const endPage = Math.min(totalPages - 1, page + paginationNeighborCount);

  for (let pageNumber = startPage; pageNumber <= endPage; pageNumber += 1) {
    pages.push(pageNumber);
  }

  if (page < totalPages - 2) {
    pages.push("trailing-ellipsis");
  }

  pages.push(totalPages);

  return pages;
};
