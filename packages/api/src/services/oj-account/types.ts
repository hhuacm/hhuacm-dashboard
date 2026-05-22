import type { OjPlatform } from "@hhuacm-dashboard/domain";

import type { Context } from "../../context";

export type Database = Context["db"];

export interface OjAccountInput {
  handle: string;
  platform: OjPlatform;
  userId: string;
}

export interface OjAccountDeleteInput {
  platform: OjPlatform;
  userId: string;
}

export interface InternalOjAccount {
  handle: string;
  id: string;
  platform: OjPlatform;
  profileUrl: string;
}
