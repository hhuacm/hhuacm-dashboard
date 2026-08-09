import type { Database, DatabaseTransaction } from "@hhuacm-dashboard/db";
import type { refreshRequestKinds } from "@hhuacm-dashboard/db/schema/refresh-request";
import { refreshRequest } from "@hhuacm-dashboard/db/schema/refresh-request";
import { and, asc, eq, inArray } from "drizzle-orm";

export type RefreshRequestKind = (typeof refreshRequestKinds)[number];
export type RefreshQueueDatabase = Database | DatabaseTransaction;

const refreshRequestFields = {
  kind: refreshRequest.kind,
  targetId: refreshRequest.targetId,
} as const;

export const enqueueRefreshRequest = async (
  db: RefreshQueueDatabase,
  input: {
    kind: RefreshRequestKind;
    targetId: string;
  }
) => {
  await db
    .insert(refreshRequest)
    .values({
      kind: input.kind,
      targetId: input.targetId,
    })
    .onConflictDoNothing({
      target: [refreshRequest.kind, refreshRequest.targetId],
    });
};

export const getQueuedRefreshTargetIds = async (
  db: Database,
  input: {
    kind: RefreshRequestKind;
    targetIds: readonly string[];
  }
) => {
  if (input.targetIds.length === 0) {
    return new Set<string>();
  }

  const requests = await db
    .select({ targetId: refreshRequest.targetId })
    .from(refreshRequest)
    .where(
      and(
        eq(refreshRequest.kind, input.kind),
        inArray(refreshRequest.targetId, input.targetIds)
      )
    );

  return new Set(requests.map((request) => request.targetId));
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
