import type { Database } from "@hhuacm-dashboard/db";
import { userOjAccount } from "@hhuacm-dashboard/db/schema/oj-account";
import type { OjPlatform } from "@hhuacm-dashboard/domain";
import { and, eq, ne } from "drizzle-orm";
import { ApplicationError } from "../../errors";
import { ojAccountFields } from "./queries";

interface OjExternalIdInput {
  externalId: string;
  platform: OjPlatform;
}

export const getExistingCurrentUserAccountMessage = (account: {
  handle: string;
  platform: string;
}) => `OJ account already exists: ${account.platform} ${account.handle}`;

const getOjExternalIdConflictMessage = (account: {
  externalId: string;
  platform: string;
}) =>
  `OJ external ID already exists: ${account.platform} ${account.externalId}`;

export const assertNoExternalIdOwner = async (
  db: Database,
  input: OjExternalIdInput,
  options: { excludeUserId?: string }
) => {
  const conditions = [
    eq(userOjAccount.platform, input.platform),
    eq(userOjAccount.externalId, input.externalId),
  ];

  if (options.excludeUserId) {
    conditions.push(ne(userOjAccount.userId, options.excludeUserId));
  }

  const [existingExternalIdOwner] = await db
    .select(ojAccountFields)
    .from(userOjAccount)
    .where(and(...conditions))
    .limit(1);

  if (existingExternalIdOwner) {
    throw new ApplicationError({
      code: "CONFLICT",
      message: getOjExternalIdConflictMessage(existingExternalIdOwner),
    });
  }
};
