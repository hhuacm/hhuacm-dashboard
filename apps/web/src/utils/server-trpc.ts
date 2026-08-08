import "server-only";

import { createContext } from "@hhuacm-dashboard/api/context";
import { appRouter } from "@hhuacm-dashboard/api/routers/index";
import { headers } from "next/headers";

export async function createServerCaller() {
  const requestHeaders = await headers();

  return appRouter.createCaller(
    await createContext({ headers: requestHeaders })
  );
}
