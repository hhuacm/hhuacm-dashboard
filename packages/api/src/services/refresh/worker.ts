import type { Context } from "../../context";
import { findRefreshJobDefinition, refreshJobDefinitions } from "./jobs";
import type { RefreshJobDefinition } from "./jobs/definition";
import { deleteRefreshRequest, getNextRefreshRequest } from "./request-store";

type Database = Context["db"];

export const runRefreshWorkerOnce = async (
  db: Database,
  definitions: readonly RefreshJobDefinition[] = refreshJobDefinitions
) => {
  const request = await getNextRefreshRequest(db);

  if (!request) {
    return null;
  }

  try {
    const definition = findRefreshJobDefinition(definitions, request.kind);
    await definition.handle(db, request);
  } finally {
    await deleteRefreshRequest(db, request);
  }

  return {
    request,
  };
};
