import type { OjPlatform } from "@hhuacm-dashboard/domain";

export type { Database } from "@hhuacm-dashboard/db";

export interface AdminUserOjAccount {
  externalId: string;
  handle: string;
  platform: OjPlatform;
}
