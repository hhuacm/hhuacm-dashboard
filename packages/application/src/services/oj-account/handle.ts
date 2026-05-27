import type { Database } from "@hhuacm-dashboard/db";
import { userOjAccount } from "@hhuacm-dashboard/db/schema/oj-account";
import type { OjPlatform } from "@hhuacm-dashboard/domain";
import { and, eq, ne } from "drizzle-orm";
import { ApplicationError } from "../../errors";
import { ojAccountFields } from "./queries";

interface OjHandleInput {
  handle: string;
  platform: OjPlatform;
}

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
  input: OjHandleInput,
  options: { excludeUserId?: string }
) => {
  const conditions = [
    eq(userOjAccount.platform, input.platform),
    eq(userOjAccount.handle, input.handle),
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
    throw new ApplicationError({
      code: "CONFLICT",
      message: getOjHandleConflictMessage(existingHandleOwner),
    });
  }
};
