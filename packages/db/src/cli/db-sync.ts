import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@libsql/client";
import dotenv from "dotenv";
import { resolveLibsqlAuthToken } from "../libsql-auth-token";
import { synchronizeDatabase } from "../sync";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const serverEnvPath = resolve(packageRoot, "../../apps/server/.env");

dotenv.config({ path: serverEnvPath });

const fail = (message: string): never => {
  throw new Error(`[db:sync] ${message}`);
};

const readDatabaseUrl = (): string => {
  const databaseUrl = process.env.DATABASE_URL;

  if (databaseUrl) {
    return databaseUrl;
  }

  return fail(`DATABASE_URL is missing. Expected it in ${serverEnvPath}.`);
};

const createDbClient = () => {
  const databaseUrl = readDatabaseUrl();

  return createClient({
    authToken: resolveLibsqlAuthToken({
      databaseAuthToken: process.env.DATABASE_AUTH_TOKEN,
      databaseUrl,
    }),
    url: databaseUrl,
  });
};

const main = async () => {
  const client = createDbClient();

  try {
    const result = await synchronizeDatabase(client);

    if (result.adoptedBaseline) {
      console.log("[db:sync] Database baseline adopted.");
    }

    console.log("[db:sync] Database migrations are applied.");
  } finally {
    client.close();
  }
};

await main();
