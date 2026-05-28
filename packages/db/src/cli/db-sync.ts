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

const readTableColumnNames = async (client: DbClient, tableName: string) => {
  const result = await client.execute(
    `PRAGMA table_info(${quoteIdentifier(tableName)});`
  );
  const columnNames: string[] = [];

  for (const row of result.rows) {
    const name = row.name;

    if (typeof name === "string") {
      columnNames.push(name);
    }
  }

  return columnNames;
};

const readTableIndexNames = async (client: DbClient, tableName: string) => {
  const result = await client.execute(
    `PRAGMA index_list(${quoteIdentifier(tableName)});`
  );
  const indexNames: string[] = [];

  for (const row of result.rows) {
    const name = row.name;

    if (typeof name === "string") {
      indexNames.push(name);
    }
  }

  return indexNames;
};

const hasTable = async (client: DbClient, tableName: string) => {
  const result = await client.execute({
    args: [tableName],
    sql: "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ? LIMIT 1;",
  });

  return result.rows.length > 0;
};

const prepareOjAccountExternalIdColumn = async (client: DbClient) => {
  if (!(await hasTable(client, "user_oj_account"))) {
    return;
  }

  const columnNames = await readTableColumnNames(client, "user_oj_account");

  if (!columnNames.includes("external_id")) {
    await client.execute(
      "ALTER TABLE user_oj_account ADD COLUMN external_id text;"
    );
  }

  const externalIdBackfillExpression = columnNames.includes("profile_url")
    ? `
      CASE
        WHEN platform = 'luogu' AND profile_url GLOB '*://www.luogu.com.cn/user/[0-9]*'
          THEN replace(substr(profile_url, length('https://www.luogu.com.cn/user/') + 1), '/', '')
        WHEN platform = 'nowcoder' AND handle = 'ForLight'
          THEN '660255087'
        ELSE handle
      END
    `
    : `
      CASE
        WHEN platform = 'nowcoder' AND handle = 'ForLight'
          THEN '660255087'
        ELSE handle
      END
    `;

  await client.execute(`
    UPDATE user_oj_account
    SET external_id = ${externalIdBackfillExpression}
    WHERE external_id IS NULL OR trim(external_id) = '';
  `);
  await client.execute(`
    UPDATE user_oj_account
    SET handle = 'F0rL1ght'
    WHERE platform = 'nowcoder' AND external_id = '660255087';
  `);

  const missingExternalIds = await client.execute(`
    SELECT id FROM user_oj_account
    WHERE external_id IS NULL OR trim(external_id) = ''
    LIMIT 1;
  `);

  if (missingExternalIds.rows.length > 0) {
    fail("user_oj_account contains rows without external_id.");
  }

  const duplicateExternalIds = await client.execute(`
    SELECT platform, external_id, count(*) as count
    FROM user_oj_account
    GROUP BY platform, external_id
    HAVING count(*) > 1
    LIMIT 1;
  `);

  if (duplicateExternalIds.rows.length > 0) {
    fail("user_oj_account contains duplicate platform/external_id pairs.");
  }

  const indexNames = await readTableIndexNames(client, "user_oj_account");

  if (indexNames.includes("user_oj_account_platform_handle_unique")) {
    await client.execute("DROP INDEX user_oj_account_platform_handle_unique;");
  }

  if (!indexNames.includes("user_oj_account_platform_external_id_unique")) {
    await client.execute(`
      CREATE UNIQUE INDEX user_oj_account_platform_external_id_unique
      ON user_oj_account (platform, external_id);
    `);
  }
};

const deleteRetiredRefreshRequests = async (client: DbClient) => {
  if (!(await hasTable(client, "refresh_request"))) {
    return;
  }

  await client.execute(
    "DELETE FROM refresh_request WHERE kind = 'luogu.profileUrl';"
  );
};

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
    await prepareOjAccountExternalIdColumn(client);
    await deleteRetiredRefreshRequests(client);
    await dropViews(client, await readViewNames(client));
    runDrizzlePush();
    await verifyDatabase(client);
    console.log("[db:sync] Database is synchronized with the Drizzle schema.");
  } finally {
    client.close();
  }
};

await main();
