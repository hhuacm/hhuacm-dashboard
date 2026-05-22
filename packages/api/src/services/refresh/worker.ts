import type { Context } from "../../context";
import {
  findRefreshRequestDefinition,
  type RefreshRequestDefinition,
  refreshRequestDefinitions,
} from "./registry";
import { deleteRefreshRequest, getNextRefreshRequest } from "./request-store";

type Database = Context["db"];

export const runRefreshWorkerOnce = async (
  db: Database,
  definitions: RefreshRequestDefinition[] = refreshRequestDefinitions
) => {
  const request = await getNextRefreshRequest(db);

  if (!request) {
    return null;
  }

  try {
    const definition = findRefreshRequestDefinition(definitions, request.kind);
    await definition.handle(db, request);
  } finally {
    await deleteRefreshRequest(db, request);
  }

  return {
    request,
  };
};
