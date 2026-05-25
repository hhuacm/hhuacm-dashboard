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
