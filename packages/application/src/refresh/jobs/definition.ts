import type { Database } from "@hhuacm-dashboard/db";
import {
  deleteRefreshRequest,
  enqueueRefreshRequest,
  type RefreshQueueDatabase,
  type RefreshRequest,
  type RefreshRequestKind,
} from "../request-store";

export interface RefreshJobDefinition {
  clear: (db: RefreshQueueDatabase, targetId: string) => Promise<void>;
  enqueue: (db: RefreshQueueDatabase, targetId: string) => Promise<boolean>;
  enqueueDueTargets?: (db: Database, now: Date) => Promise<number>;
  handle: (db: Database, request: RefreshRequest) => Promise<void>;
  kind: RefreshRequestKind;
}

export const defineRefreshJob = (
  input: Omit<RefreshJobDefinition, "clear" | "enqueue">
): RefreshJobDefinition => ({
  ...input,
  clear: async (db, targetId) => {
    await deleteRefreshRequest(db, {
      kind: input.kind,
      targetId,
    });
  },
  enqueue: async (db, targetId) =>
    await enqueueRefreshRequest(db, {
      kind: input.kind,
      targetId,
    }),
});
