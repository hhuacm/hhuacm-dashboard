import { describe, expect, it } from "bun:test";
import { tmpdir } from "node:os";
import path from "node:path";
import type { Database } from "@hhuacm-dashboard/db";
import { user } from "@hhuacm-dashboard/db/schema/auth";
import { siteSetting } from "@hhuacm-dashboard/db/schema/site-setting";
import { createClient } from "@libsql/client";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/libsql";
import {
  bootstrapAdminUserIdSettingKey,
  ensureFirstUserIsAdmin,
} from "./bootstrap-admin";

const createAuthTestDb = async () => {
  const client = createClient({
    url: `file:${path.join(
      tmpdir(),
      `hhuacm-auth-test-${crypto.randomUUID()}.db`
    )}`,
  });

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
    create table site_setting (
      key text primary key not null,
      value text not null,
      updated_at integer default (cast(unixepoch('subsecond') * 1000 as integer)) not null
    )
  `);

  return drizzle({
    client,
    schema: {
      siteSetting,
      user,
    },
  }) as unknown as Database;
};

const createUser = async (
  db: Awaited<ReturnType<typeof createAuthTestDb>>,
  input: {
    createdAt?: Date;
    id: string;
    username: string;
  }
) => {
  const timestamp = input.createdAt ?? new Date();

  await db.insert(user).values({
    createdAt: timestamp,
    email: `${input.username}@example.com`,
    emailVerified: false,
    id: input.id,
    name: input.username,
    updatedAt: timestamp,
    username: input.username,
  });
};

const readUserRole = async (
  db: Awaited<ReturnType<typeof createAuthTestDb>>,
  userId: string
) => {
  const [row] = await db
    .select({ role: user.role })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  return row?.role;
};

describe("bootstrap admin", () => {
  it("grants admin to the first created user", async () => {
    const db = await createAuthTestDb();

    await createUser(db, { id: "first", username: "first" });
    const result = await ensureFirstUserIsAdmin(db, { userId: "first" });

    const [setting] = await db
      .select({ value: siteSetting.value })
      .from(siteSetting)
      .where(eq(siteSetting.key, bootstrapAdminUserIdSettingKey))
      .limit(1);

    expect(result).toEqual({ granted: true });
    expect(await readUserRole(db, "first")).toBe("admin");
    expect(setting?.value).toBe("first");
  });

  it("keeps later users as regular users", async () => {
    const db = await createAuthTestDb();

    await createUser(db, {
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      id: "first",
      username: "first",
    });
    await createUser(db, {
      createdAt: new Date("2026-01-01T00:00:01.000Z"),
      id: "second",
      username: "second",
    });

    const result = await ensureFirstUserIsAdmin(db, { userId: "second" });

    expect(result).toEqual({ granted: false });
    expect(await readUserRole(db, "second")).toBe("user");
  });

  it("only grants bootstrap admin once", async () => {
    const db = await createAuthTestDb();

    await createUser(db, { id: "first", username: "first" });

    expect(await ensureFirstUserIsAdmin(db, { userId: "first" })).toEqual({
      granted: true,
    });
    expect(await ensureFirstUserIsAdmin(db, { userId: "first" })).toEqual({
      granted: false,
    });
    expect(await readUserRole(db, "first")).toBe("admin");
  });
});
