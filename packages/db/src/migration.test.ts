import { describe, expect, it } from "bun:test";
import { readFile } from "node:fs/promises";
import { createClient } from "@libsql/client";

const runMigration = async (
  client: ReturnType<typeof createClient>,
  name: string
) => {
  const sql = await readFile(
    new URL(`./migrations/${name}`, import.meta.url),
    "utf8"
  );

  for (const statement of sql.split("--> statement-breakpoint")) {
    if (statement.trim()) {
      await client.execute(statement);
    }
  }
};

describe("member profile migration", () => {
  it("moves existing profile data into user and fills missing fields", async () => {
    const client = createClient({ url: ":memory:" });

    try {
      await client.execute("pragma foreign_keys = on");
      await runMigration(client, "0000_init.sql");
      await client.execute(`
        INSERT INTO user (id, name, email, username)
        VALUES
          ('complete', 'old name', 'complete@example.com', 'complete'),
          ('blank', 'old name', 'blank@example.com', 'blank'),
          ('missing', 'old name', 'missing@example.com', 'missing')
      `);
      await client.execute(`
        INSERT INTO user_profile (
          user_id,
          real_name,
          grade,
          student_id,
          major,
          member_status
        )
        VALUES
          ('complete', ' 张三 ', ' 24级 ', ' 20240001 ', ' 计算机 ', 'active'),
          ('blank', ' ', '', NULL, ' ', 'selection')
      `);

      await runMigration(client, "0001_collapse-member-profile.sql");

      const users = await client.execute(`
        SELECT
          id,
          name,
          grade,
          student_id AS studentId,
          major,
          member_status AS memberStatus
        FROM user
        ORDER BY id
      `);
      const profileTable = await client.execute(`
        SELECT name FROM sqlite_master
        WHERE type = 'table' AND name = 'user_profile'
      `);
      const currentMembers = await client.execute(`
        SELECT user_id AS userId FROM current_member ORDER BY user_id
      `);
      const foreignKeyErrors = await client.execute("pragma foreign_key_check");

      expect(
        users.rows.map((row) => ({
          grade: row.grade,
          id: row.id,
          major: row.major,
          memberStatus: row.memberStatus,
          name: row.name,
          studentId: row.studentId,
        }))
      ).toEqual([
        {
          grade: "未知",
          id: "blank",
          major: "未知",
          memberStatus: "selection",
          name: "未知",
          studentId: "未知",
        },
        {
          grade: "24级",
          id: "complete",
          major: "计算机",
          memberStatus: "active",
          name: "张三",
          studentId: "20240001",
        },
        {
          grade: "未知",
          id: "missing",
          major: "未知",
          memberStatus: "selection",
          name: "未知",
          studentId: "未知",
        },
      ]);
      expect(profileTable.rows).toHaveLength(0);
      expect(currentMembers.rows.map((row) => row.userId)).toEqual([
        "blank",
        "complete",
        "missing",
      ]);
      expect(foreignKeyErrors.rows).toHaveLength(0);
    } finally {
      client.close();
    }
  });
});
