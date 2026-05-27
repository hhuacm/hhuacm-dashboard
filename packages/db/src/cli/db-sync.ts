import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@libsql/client";
import dotenv from "dotenv";

type DbClient = ReturnType<typeof createClient>;

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const serverEnvPath = resolve(packageRoot, "../../apps/server/.env");
const drizzlePushErrorPattern =
  /\b(LibsqlError|ResponseError|Could not process view)\b/;

dotenv.config({ path: serverEnvPath });

const fail = (message: string): never => {
  throw new Error(`[db:sync] ${message}`);
};

const quoteIdentifier = (identifier: string) =>
  `"${identifier.replaceAll('"', '""')}"`;

const getLocalAuthToken = (databaseUrl: string) => {
  if (
    databaseUrl.startsWith("file:") ||
    databaseUrl.startsWith("http://127.0.0.1") ||
    databaseUrl.startsWith("http://localhost")
  ) {
    return "local";
  }

  return "";
};

const createDbClient = () => {
  const databaseUrl = process.env.DATABASE_URL ?? "";

  if (!databaseUrl) {
    fail(`DATABASE_URL is missing. Expected it in ${serverEnvPath}.`);
  }

  return createClient({
    authToken:
      process.env.DATABASE_AUTH_TOKEN || getLocalAuthToken(databaseUrl),
    url: databaseUrl,
  });
};

const readViewNames = async (client: DbClient) => {
  const result = await client.execute(
    "SELECT name FROM sqlite_master WHERE type = 'view' ORDER BY name;"
  );
  const names: string[] = [];

  for (const row of result.rows) {
    const name = row.name;

    if (typeof name === "string") {
      names.push(name);
      continue;
    }

    fail("Could not read a view name from sqlite_master.");
  }

  return names;
};

const dropViews = async (client: DbClient, viewNames: string[]) => {
  for (const name of viewNames) {
    await client.execute(`DROP VIEW IF EXISTS ${quoteIdentifier(name)}`);
  }
};

const runDrizzlePush = () => {
  const result = spawnSync("bun", ["x", "drizzle-kit", "push", "--force"], {
    cwd: packageRoot,
    encoding: "utf8",
    env: process.env,
  });

  const stdout = result.stdout ?? "";
  const stderr = result.stderr ?? "";
  const output = `${stdout}\n${stderr}`;

  process.stdout.write(stdout);
  process.stderr.write(stderr);

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0 || drizzlePushErrorPattern.test(output)) {
    fail("drizzle-kit push failed.");
  }
};

const verifyViews = async (client: DbClient) => {
  const viewNames = await readViewNames(client);

  for (const name of viewNames) {
    await client.execute(`SELECT * FROM ${quoteIdentifier(name)} LIMIT 0;`);
  }
};

const verifyDatabase = async (client: DbClient) => {
  const integrity = await client.execute("PRAGMA integrity_check;");

  if (integrity.rows[0]?.integrity_check !== "ok") {
    fail("PRAGMA integrity_check failed.");
  }

  const foreignKeys = await client.execute("PRAGMA foreign_key_check;");

  if (foreignKeys.rows.length > 0) {
    fail(
      `PRAGMA foreign_key_check reported ${foreignKeys.rows.length} issue(s).`
    );
  }

  await verifyViews(client);
};

const main = async () => {
  const client = createDbClient();

  try {
    await dropViews(client, await readViewNames(client));
    runDrizzlePush();
    await verifyDatabase(client);
    console.log("[db:sync] Database is synchronized with the Drizzle schema.");
  } finally {
    client.close();
  }
};

await main();
