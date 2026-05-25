import { userOjAccount } from "@hhuacm-dashboard/db/schema/oj-account";
import { and, eq } from "drizzle-orm";

import type { Context } from "../../context";
import {
  buildLuoguProfileUrl,
  type LuoguUserSearchLoader,
} from "../oj-profile-url";

type Database = Context["db"];

export interface LuoguProfileUrlAccount {
  handle: string;
  id: string;
}

const luoguProfileUrlFields = {
  handle: userOjAccount.handle,
  id: userOjAccount.id,
  profileUrl: userOjAccount.profileUrl,
} as const;

export const refreshLuoguProfileUrl = async (
  db: Database,
  account: LuoguProfileUrlAccount,
  searchUsers?: LuoguUserSearchLoader
) => {
  const profileUrl = await buildLuoguProfileUrl(account.handle, searchUsers);
  const [updatedAccount] = await db
    .update(userOjAccount)
    .set({ profileUrl })
    .where(
      and(
        eq(userOjAccount.id, account.id),
        eq(userOjAccount.platform, "luogu"),
        eq(userOjAccount.handle, account.handle)
      )
    )
    .returning(luoguProfileUrlFields);

  if (!updatedAccount) {
    throw new Error(`Luogu account changed while refreshing: ${account.id}`);
  }

  return updatedAccount;
};
