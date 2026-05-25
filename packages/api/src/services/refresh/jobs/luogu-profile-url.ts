import { userOjAccount } from "@hhuacm-dashboard/db/schema/oj-account";
import { and, eq } from "drizzle-orm";

import type { Context } from "../../../context";
import { refreshLuoguProfileUrl } from "../../luogu/profile-url";
import type { LuoguUserSearchLoader } from "../../oj-profile-url";
import type { RefreshRequestDefinition } from "../registry";
import { luoguProfileUrlRequestKind } from "../request-types";
import { requestLuoguProfileUrlRefresh } from "../requests";

type Database = Context["db"];

const luoguProfileUrlAccountFields = {
  handle: userOjAccount.handle,
  id: userOjAccount.id,
} as const;

export const handleLuoguProfileUrlRequest = async (
  db: Database,
  request: Parameters<RefreshRequestDefinition["handle"]>[1],
  searchUsers?: LuoguUserSearchLoader
) => {
  const [account] = await db
    .select(luoguProfileUrlAccountFields)
    .from(userOjAccount)
    .where(
      and(
        eq(userOjAccount.id, request.targetId),
        eq(userOjAccount.platform, "luogu")
      )
    )
    .limit(1);

  if (!account) {
    throw new Error(`Luogu account does not exist: ${request.targetId}`);
  }

  await refreshLuoguProfileUrl(db, account, searchUsers);
};

const enqueueMissingLuoguProfileUrlTargets = async (
  db: Database,
  _now: Date
) => {
  const accounts = await db
    .select(luoguProfileUrlAccountFields)
    .from(userOjAccount)
    .where(
      and(eq(userOjAccount.platform, "luogu"), eq(userOjAccount.profileUrl, ""))
    );

  for (const account of accounts) {
    await requestLuoguProfileUrlRefresh(db, account.id);
  }

  return accounts.length;
};

export const luoguProfileUrlRefreshRequestDefinition = {
  enqueueDueTargets: enqueueMissingLuoguProfileUrlTargets,
  handle: handleLuoguProfileUrlRequest,
  kind: luoguProfileUrlRequestKind,
} as const satisfies RefreshRequestDefinition;
