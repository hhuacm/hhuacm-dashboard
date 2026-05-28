import type { memberStatuses, OjPlatform } from "@hhuacm-dashboard/domain";

export type { Database } from "@hhuacm-dashboard/db";

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
  sort?:
    | {
        column: AdminUsersSortColumn;
        direction: "ascending" | "descending";
      }
    | undefined;
}

export interface AdminUserOjAccount {
  externalId: string;
  handle: string;
  platform: OjPlatform;
}
