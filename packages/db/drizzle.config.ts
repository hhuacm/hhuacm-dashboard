import dotenv from "dotenv";
import { defineConfig } from "drizzle-kit";
import { resolveLibsqlAuthToken } from "./src/libsql-auth-token";

dotenv.config({
  path: "../../apps/server/.env",
});

const databaseUrl = process.env.DATABASE_URL ?? "file:local.db";

export default defineConfig({
  schema: [
    "./src/schema/auth.ts",
    "./src/schema/profile.ts",
    "./src/schema/current-member.ts",
    "./src/schema/oj-account.ts",
    "./src/schema/atcoder-account-stats.ts",
    "./src/schema/codeforces-account-stats.ts",
    "./src/schema/luogu-account-stats.ts",
    "./src/schema/nowcoder-account-stats.ts",
    "./src/schema/problem-set.ts",
    "./src/schema/refresh-request.ts",
    "./src/schema/site-setting.ts",
    "./src/schema/user-award.ts",
  ],
  out: "./src/migrations",
  dialect: "turso",
  dbCredentials: {
    url: databaseUrl,
    authToken: resolveLibsqlAuthToken({
      databaseAuthToken: process.env.DATABASE_AUTH_TOKEN,
      databaseUrl,
    }),
  },
});
