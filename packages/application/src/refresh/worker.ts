import type { Database } from "@hhuacm-dashboard/db";
import { refreshRequestHandlers } from "./jobs";
import { completeRefreshRequest, getNextRefreshRequest } from "./request-store";

export const runRefreshWorkerOnce = async (db: Database) => {
  const request = await getNextRefreshRequest(db);

  if (!request) {
    return false;
  }

  try {
    await refreshRequestHandlers[request.kind](db, request.targetId);
  } finally {
    await completeRefreshRequest(db, request.id);
  }

  return true;
};
