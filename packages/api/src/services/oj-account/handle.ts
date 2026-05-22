import { userOjAccount } from "@hhuacm-dashboard/db/schema/oj-account";
import { TRPCError } from "@trpc/server";
import { and, eq, ne } from "drizzle-orm";

import { ojAccountFields } from "./queries";
import type { Database, OjAccountInput } from "./types";

export const normalizeOjHandle = (handle: string) => handle.toLowerCase();

export const getExistingCurrentUserAccountMessage = (account: {
  handle: string;
  platform: string;
}) => `OJ account already exists: ${account.platform} ${account.handle}`;

const getOjHandleConflictMessage = (account: {
  handle: string;
  platform: string;
}) => `OJ handle already exists: ${account.platform} ${account.handle}`;

export const assertNoHandleOwner = async (
  db: Database,
  input: OjAccountInput,
  options: { excludeUserId?: string }
) => {
  const conditions = [
    eq(userOjAccount.platform, input.platform),
    eq(userOjAccount.normalizedHandle, normalizeOjHandle(input.handle)),
  ];

  if (options.excludeUserId) {
    conditions.push(ne(userOjAccount.userId, options.excludeUserId));
  }

  const [existingHandleOwner] = await db
    .select(ojAccountFields)
    .from(userOjAccount)
    .where(and(...conditions))
    .limit(1);

  if (existingHandleOwner) {
    throw new TRPCError({
      code: "CONFLICT",
      message: getOjHandleConflictMessage(existingHandleOwner),
    });
  }
};
