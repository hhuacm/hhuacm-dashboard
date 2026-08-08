import { getAuth } from "@hhuacm-dashboard/auth";
import { getDb } from "@hhuacm-dashboard/db";

interface CreateContextOptions {
  headers: Headers;
}

export async function createContext({ headers }: CreateContextOptions) {
  const auth = getAuth();
  const session = await auth.api.getSession({
    asResponse: false,
    headers,
  });

  return {
    db: getDb(),
    session,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
