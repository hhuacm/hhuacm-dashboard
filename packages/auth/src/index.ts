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
import { env } from "@hhuacm-dashboard/env/server";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { username } from "better-auth/plugins";

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

  return betterAuth({
    basePath: "/api/auth",
    database: drizzleAdapter(db, {
      provider: "sqlite",

      schema: authSchema,
    }),
    trustedOrigins: [env.CORS_ORIGIN],
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
    },
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    advanced: {
      defaultCookieAttributes: {
        sameSite: "lax",
        secure: env.NODE_ENV === "production",
        httpOnly: true,
      },
    },
    plugins: [username({ usernameNormalization: false })],
  });
}

export const auth = createAuth();
