import type { memberStatuses, OjPlatform } from "@hhuacm-dashboard/domain";

import type { Context } from "../../context";

export type Database = Context["db"];

export type AdminUsersSortColumn =
  | "email"
  | "grade"
  | "major"
  | "memberStatus"
  | "realName"
  | "studentId"
  | "username";

export interface AdminUsersListInput {
  filters?:
    | {
        grades?: string[];
        memberStatuses?: (typeof memberStatuses)[number][];
        ojPlatforms?: OjPlatform[];
      }
    | undefined;
  page: number;
  pageSize: number;
  sort?:
    | {
        column: AdminUsersSortColumn;
        direction: "ascending" | "descending";
      }
    | undefined;
}

export interface AdminUserOjAccount {
  handle: string;
  platform: OjPlatform;
  profileUrl: string;
}

export interface AdminUsersExportOjAccount {
  handle: string;
  platform: OjPlatform;
}

export interface AdminUsersExportUser {
  email: string;
  grade: null | string;
  major: null | string;
  ojAccounts: AdminUsersExportOjAccount[];
  realName: null | string;
  studentId: null | string;
  username: string;
}

export interface AdminUsersExport {
  exportedAt: string;
  hash: string;
  users: AdminUsersExportUser[];
  version: 1;
}
