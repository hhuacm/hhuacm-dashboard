import "server-only";

import type { AppRouter } from "@hhuacm-dashboard/api/routers/index";
import { env } from "@hhuacm-dashboard/env/web";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import { headers } from "next/headers";

export async function createServerCaller() {
  const requestHeaders = await headers();

  return createTRPCClient<AppRouter>({
    links: [
      httpBatchLink({
        headers() {
          return {
            cookie: requestHeaders.get("cookie") ?? "",
          };
        },
        url: `${env.NEXT_PUBLIC_SERVER_URL}/trpc`,
      }),
    ],
  });
}
