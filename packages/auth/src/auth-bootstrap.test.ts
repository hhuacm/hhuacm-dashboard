import { describe, expect, it } from "bun:test";
import { tmpdir } from "node:os";
import path from "node:path";
import { user } from "@hhuacm-dashboard/db/schema/auth";
import { createClient } from "@libsql/client";
import { asc } from "drizzle-orm";

const createAuthTables = async (databaseUrl: string) => {
  const client = createClient({ url: databaseUrl });

  await client.execute(`
    create table user (
      id text primary key not null,
      name text not null,
      email text not null unique,
      email_verified integer default 0 not null,
      image text,
      username text not null unique,
      display_username text,
      role text default 'user' not null,
      created_at integer default (cast(unixepoch('subsecond') * 1000 as integer)) not null,
      updated_at integer default (cast(unixepoch('subsecond') * 1000 as integer)) not null
    )
  `);
  await client.execute(`
    create table account (
      id text primary key not null,
      account_id text not null,
      provider_id text not null,
      user_id text not null references user(id) on delete cascade,
      access_token text,
      refresh_token text,
      id_token text,
      access_token_expires_at integer,
      refresh_token_expires_at integer,
      scope text,
      password text,
      created_at integer default (cast(unixepoch('subsecond') * 1000 as integer)) not null,
      updated_at integer default (cast(unixepoch('subsecond') * 1000 as integer)) not null
    )
  `);
  await client.execute("create index account_userId_idx on account(user_id)");
  await client.execute(`
    create table session (
      id text primary key not null,
      expires_at integer not null,
      token text not null unique,
      created_at integer default (cast(unixepoch('subsecond') * 1000 as integer)) not null,
      updated_at integer default (cast(unixepoch('subsecond') * 1000 as integer)) not null,
      ip_address text,
      user_agent text,
      user_id text not null references user(id) on delete cascade
    )
  `);
  await client.execute("create index session_userId_idx on session(user_id)");
  await client.execute(`
    create table verification (
      id text primary key not null,
      identifier text not null,
      value text not null,
      expires_at integer not null,
      created_at integer default (cast(unixepoch('subsecond') * 1000 as integer)) not null,
      updated_at integer default (cast(unixepoch('subsecond') * 1000 as integer)) not null
    )
  `);
  await client.execute(
    "create index verification_identifier_idx on verification(identifier)"
  );
  await client.execute(`
    create table site_setting (
      key text primary key not null,
      value text not null,
      updated_at integer default (cast(unixepoch('subsecond') * 1000 as integer)) not null
    )
  `);

  client.close();
};

const configureAuthEnv = (databaseUrl: string) => {
  process.env.DATABASE_URL = databaseUrl;
  process.env.DATABASE_AUTH_TOKEN = "";
  process.env.BETTER_AUTH_SECRET = "temporary-secret-for-auth-bootstrap-test";
  process.env.BETTER_AUTH_URL = "http://localhost:3000";
  process.env.CORS_ORIGIN = "http://localhost:3001";
  process.env.NODE_ENV = "test";
};

describe("auth bootstrap", () => {
  it("grants admin through the Better Auth sign-up hook", async () => {
    const databaseUrl = `file:${path.join(
      tmpdir(),
      `hhuacm-auth-bootstrap-${crypto.randomUUID()}.db`
    )}`;
    configureAuthEnv(databaseUrl);
    await createAuthTables(databaseUrl);

    const [{ createAuth }, { createDb }] = await Promise.all([
      import("./index"),
      import("@hhuacm-dashboard/db"),
    ]);
    const auth = createAuth();

    await auth.api.signUpEmail({
      body: {
        email: "first@example.com",
        name: "first",
        password: "password123",
        username: "first",
      },
    });
    await auth.api.signUpEmail({
      body: {
        email: "second@example.com",
        name: "second",
        password: "password123",
        username: "second",
      },
    });

    const db = createDb();
    const users = await db
      .select({ role: user.role, username: user.username })
      .from(user)
      .orderBy(asc(user.username));

    expect(users).toEqual([
      { role: "admin", username: "first" },
      { role: "user", username: "second" },
    ]);
  });
});
