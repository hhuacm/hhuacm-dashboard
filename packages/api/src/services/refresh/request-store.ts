import { refreshRequest } from "@hhuacm-dashboard/db/schema/refresh-request";
import { and, asc, eq, type InferSelectModel } from "drizzle-orm";

import type { Context } from "../../context";
import type { RefreshRequestKind } from "./request-types";

type Database = Context["db"];

const refreshRequestFields = {
  createdAt: refreshRequest.createdAt,
  kind: refreshRequest.kind,
  targetId: refreshRequest.targetId,
} as const;

export type RefreshRequest = Pick<
  InferSelectModel<typeof refreshRequest>,
  keyof typeof refreshRequestFields
>;

export const createRefreshRequest = async (
  db: Database,
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

  if (createdRequest) {
    return createdRequest;
  }

  const [existingRequest] = await db
    .select(refreshRequestFields)
    .from(refreshRequest)
    .where(
      and(
        eq(refreshRequest.kind, input.kind),
        eq(refreshRequest.targetId, input.targetId)
      )
    )
    .limit(1);

  return existingRequest ?? null;
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
  db: Database,
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
