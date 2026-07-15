import type { Database } from "@hhuacm-dashboard/db";
import { userOjAccount } from "@hhuacm-dashboard/db/schema/oj-account";
import { type OjPlatform, ojPlatformNames } from "@hhuacm-dashboard/domain";
import { and, eq } from "drizzle-orm";
import type { OjAccountIdentity } from "../../services/oj-account/queries";
import type { RefreshJobDefinition } from "./definition";

type AccountStatsEffect = (
  db: Database,
  account: OjAccountIdentity
) => Promise<unknown>;

interface AccountStatsRefreshHandlerOptions {
  markFailed: (
    db: Database,
    account: OjAccountIdentity,
    error: unknown
  ) => Promise<unknown>;
  platform: OjPlatform;
  sync: AccountStatsEffect;
}

const accountFields = {
  externalId: userOjAccount.externalId,
  handle: userOjAccount.handle,
  id: userOjAccount.id,
} as const;

export const createAccountStatsRefreshHandler = (
  options: AccountStatsRefreshHandlerOptions
): RefreshJobDefinition["handle"] =>
  async function handleAccountStatsRefresh(db, request) {
    const [account] = await db
      .select(accountFields)
      .from(userOjAccount)
      .where(
        and(
          eq(userOjAccount.id, request.targetId),
          eq(userOjAccount.platform, options.platform)
        )
      )
      .limit(1);

    if (!account) {
      throw new Error(
        `${ojPlatformNames[options.platform]} account does not exist: ${request.targetId}`
      );
    }

    try {
      await options.sync(db, account);
    } catch (error) {
      await options.markFailed(db, account, error);
    }
  };
