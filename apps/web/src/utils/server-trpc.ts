import "server-only";

import { createContext } from "@hhuacm-dashboard/api/context";
import { appRouter } from "@hhuacm-dashboard/api/routers/index";
import { headers } from "next/headers";

export async function createServerRequest() {
  const requestHeaders = await headers();
  const context = await createContext({ headers: requestHeaders });

  return {
    caller: appRouter.createCaller(context),
    session: context.session,
  };
}
