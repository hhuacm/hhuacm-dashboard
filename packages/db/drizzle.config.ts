import dotenv from "dotenv";
import { defineConfig } from "drizzle-kit";

dotenv.config({
  path: "../../apps/server/.env",
});

const databaseUrl = process.env.DATABASE_URL || "";
const isLocalLibsqlServer =
  databaseUrl.startsWith("http://127.0.0.1") ||
  databaseUrl.startsWith("http://localhost");

export default defineConfig({
  schema: [
    "./src/schema/auth.ts",
    "./src/schema/profile.ts",
    "./src/schema/oj-account.ts",
    "./src/schema/codeforces-account-stats.ts",
    "./src/schema/luogu-account-stats.ts",
    "./src/schema/problem-set.ts",
    "./src/schema/refresh-job.ts",
    "./src/schema/user-award.ts",
  ],
  out: "./src/migrations",
  dialect: "turso",
  dbCredentials: {
    url: databaseUrl,
    authToken:
      process.env.DATABASE_AUTH_TOKEN || (isLocalLibsqlServer ? "local" : ""),
  },
});
