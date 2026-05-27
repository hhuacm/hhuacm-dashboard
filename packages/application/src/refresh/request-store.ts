import type { Database, DatabaseTransaction } from "@hhuacm-dashboard/db";
import type { refreshRequestKinds } from "@hhuacm-dashboard/db/schema/refresh-request";
import { refreshRequest } from "@hhuacm-dashboard/db/schema/refresh-request";
import { and, asc, eq, type InferSelectModel } from "drizzle-orm";

type Transaction = DatabaseTransaction;

export type RefreshRequestKind = (typeof refreshRequestKinds)[number];
export type RefreshQueueDatabase = Database | Transaction;

const refreshRequestFields = {
  createdAt: refreshRequest.createdAt,
  kind: refreshRequest.kind,
  targetId: refreshRequest.targetId,
} as const;

export type RefreshRequest = Pick<
  InferSelectModel<typeof refreshRequest>,
  keyof typeof refreshRequestFields
>;

export const enqueueRefreshRequest = async (
  db: RefreshQueueDatabase,
  input: {
    kind: RefreshRequestKind;
    targetId: string;
  }
) => {
  const [createdRequest] = await db
    .insert(refreshRequest)
    .values({
      kind: input.kind,
      targetId: input.targetId,
    })
    .onConflictDoNothing({
      target: [refreshRequest.kind, refreshRequest.targetId],
    })
    .returning(refreshRequestFields);

  return Boolean(createdRequest);
};

export const getNextRefreshRequest = async (db: Database) => {
  const [request] = await db
    .select(refreshRequestFields)
    .from(refreshRequest)
    .orderBy(asc(refreshRequest.createdAt))
    .limit(1);

  return request ?? null;
};

export const deleteRefreshRequest = async (
  db: RefreshQueueDatabase,
  input: {
    kind: RefreshRequestKind;
    targetId: string;
  }
) => {
  await db
    .delete(refreshRequest)
    .where(
      and(
        eq(refreshRequest.kind, input.kind),
        eq(refreshRequest.targetId, input.targetId)
      )
    );
};
