import type { Database, DatabaseTransaction } from "@hhuacm-dashboard/db";
import { userOjAccount } from "@hhuacm-dashboard/db/schema/oj-account";
import { and, eq } from "drizzle-orm";
import type { OjAccountIdentity } from "./queries";

export const commitOjAccountRefresh = async (
  db: Database,
  account: OjAccountIdentity,
  write: (tx: DatabaseTransaction) => Promise<void>
) => {
  // libSQL begins a write transaction, keeping the binding check and writes atomic.
  await db.transaction(async (tx) => {
    const currentAccount = await tx
      .select({ id: userOjAccount.id })
      .from(userOjAccount)
      .where(
        and(
          eq(userOjAccount.id, account.id),
          eq(userOjAccount.externalId, account.externalId)
        )
      )
      .get();

    // The external request may have outlived a binding change or deletion.
    if (currentAccount) {
      await write(tx);
    }
  });
};
