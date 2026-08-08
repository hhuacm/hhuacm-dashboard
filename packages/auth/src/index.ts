import { createDb } from "@hhuacm-dashboard/db";
import {
  account,
  accountRelations,
  session,
  sessionRelations,
  user,
  userRelations,
  verification,
} from "@hhuacm-dashboard/db/schema/auth";
import { getAuthEnv } from "@hhuacm-dashboard/env/auth";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { username } from "better-auth/plugins";
import { ensureFirstUserIsAdmin } from "./bootstrap-admin";

const authSchema = {
  account,
  accountRelations,
  session,
  sessionRelations,
  user,
  userRelations,
  verification,
} as const;

export function createAuth() {
  const db = createDb();
  const env = getAuthEnv();

  return betterAuth({
    database: drizzleAdapter(db, {
      provider: "sqlite",

      schema: authSchema,
    }),
    databaseHooks: {
      user: {
        create: {
          after: async (createdUser) => {
            await ensureFirstUserIsAdmin(db, { userId: createdUser.id });
          },
        },
      },
    },
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
    },
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    plugins: [username({ usernameNormalization: false })],
  });
}

let auth: ReturnType<typeof createAuth> | undefined;

export const getAuth = () => {
  auth ??= createAuth();

  return auth;
};
