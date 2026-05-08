import { auth } from "@hhuacm-dashboard/auth";
import { db } from "@hhuacm-dashboard/db";

interface CreateContextOptions {
  headers: Headers;
}

export async function createContext({ headers }: CreateContextOptions) {
  const session = await auth.api.getSession({
    asResponse: false,
    headers,
  });

  return {
    db,
    session,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
