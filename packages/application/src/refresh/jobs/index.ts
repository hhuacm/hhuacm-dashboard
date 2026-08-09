import type { Database } from "@hhuacm-dashboard/db";
import { accountStatsRefreshHandlers } from "../account-stats";
import type { RefreshRequestKind } from "../request-store";
import { userAwardsFromLuoguRefreshKind } from "../user-awards";
import {
  handleLuoguProblemDetailsRequest,
  luoguProblemDetailsRefreshKind,
} from "./luogu-problem-details";
import { handleUserAwardsFromLuoguRequest } from "./user-awards-from-luogu";

type RefreshRequestHandler = (db: Database, targetId: string) => Promise<void>;

export const refreshRequestHandlers = {
  ...accountStatsRefreshHandlers,
  [luoguProblemDetailsRefreshKind]: handleLuoguProblemDetailsRequest,
  [userAwardsFromLuoguRefreshKind]: handleUserAwardsFromLuoguRequest,
} satisfies Record<RefreshRequestKind, RefreshRequestHandler>;
