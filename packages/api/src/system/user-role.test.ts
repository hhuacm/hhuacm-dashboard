import { describe, expect, it } from "bun:test";
import { user } from "@hhuacm-dashboard/db/schema/auth";
import { eq } from "drizzle-orm";
import { createServiceTestDb } from "../services/test-db";
import { SystemUserNotFoundError, setUserRoleByUsername } from "./user-role";

const createUser = async (
  db: Awaited<ReturnType<typeof createServiceTestDb>>,
  input: {
    id: string;
    role?: "admin" | "user";
    username?: string;
  }
) => {
  await db.insert(user).values({
    email: `${input.id}@example.com`,
    id: input.id,
    name: input.id,
    role: input.role ?? "user",
    username: input.username ?? input.id,
  });
};

const getUserRole = async (
  db: Awaited<ReturnType<typeof createServiceTestDb>>,
  username: string
) => {
  const [targetUser] = await db
    .select({ role: user.role })
    .from(user)
    .where(eq(user.username, username))
    .limit(1);

  return targetUser?.role;
};

describe("system user role", () => {
  it("grants admin role to a regular user", async () => {
    const db = await createServiceTestDb();
    await createUser(db, { id: "forlight" });

    const result = await setUserRoleByUsername(db, {
      role: "admin",
      username: "forlight",
    });

    expect(result).toEqual({
      changed: true,
      email: "forlight@example.com",
      newRole: "admin",
      oldRole: "user",
      username: "forlight",
    });
    await expect(getUserRole(db, "forlight")).resolves.toBe("admin");
  });

  it("revokes admin role from an admin user", async () => {
    const db = await createServiceTestDb();
    await createUser(db, { id: "admin-user", role: "admin" });

    const result = await setUserRoleByUsername(db, {
      role: "user",
      username: "admin-user",
    });

    expect(result).toEqual({
      changed: true,
      email: "admin-user@example.com",
      newRole: "user",
      oldRole: "admin",
      username: "admin-user",
    });
    await expect(getUserRole(db, "admin-user")).resolves.toBe("user");
  });

  it("keeps repeated role changes as no-ops", async () => {
    const db = await createServiceTestDb();
    await createUser(db, { id: "already-admin", role: "admin" });

    const result = await setUserRoleByUsername(db, {
      role: "admin",
      username: "already-admin",
    });

    expect(result).toEqual({
      changed: false,
      email: "already-admin@example.com",
      newRole: "admin",
      oldRole: "admin",
      username: "already-admin",
    });
    await expect(getUserRole(db, "already-admin")).resolves.toBe("admin");
  });

  it("fails when the username does not exist", async () => {
    const db = await createServiceTestDb();

    await expect(
      setUserRoleByUsername(db, {
        role: "admin",
        username: "missing-user",
      })
    ).rejects.toBeInstanceOf(SystemUserNotFoundError);
  });

  it("allows revoking the only admin", async () => {
    const db = await createServiceTestDb();
    await createUser(db, { id: "only-admin", role: "admin" });

    await setUserRoleByUsername(db, {
      role: "user",
      username: "only-admin",
    });

    await expect(getUserRole(db, "only-admin")).resolves.toBe("user");
  });
});
