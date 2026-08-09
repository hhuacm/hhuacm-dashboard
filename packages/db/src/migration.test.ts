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

describe("refresh attempt timestamp migration", () => {
  it("keeps cached refresh results while removing unused attempt timestamps", async () => {
    const client = createClient({ url: ":memory:" });

    try {
      await client.execute("pragma foreign_keys = on");
      await runMigration(client, "0000_init.sql");
      await runMigration(client, "0001_collapse-member-profile.sql");
      await client.execute(`
        INSERT INTO user (id, name, email, username)
        VALUES ('member', 'Member', 'member@example.com', 'member')
      `);
      await client.execute(`
        INSERT INTO user_oj_account (id, user_id, platform, external_id, handle)
        VALUES
          ('atcoder', 'member', 'atcoder', 'atcoder-id', 'atcoder-handle'),
          ('codeforces', 'member', 'codeforces', 'codeforces-id', 'codeforces-handle'),
          ('luogu', 'member', 'luogu', 'luogu-id', 'luogu-handle'),
          ('nowcoder', 'member', 'nowcoder', 'nowcoder-id', 'nowcoder-handle')
      `);
      await client.execute(`
        INSERT INTO atcoder_account_stats (
          account_id,
          rating,
          recent_performance_average,
          fetched_at,
          last_attempted_at,
          last_error
        ) VALUES ('atcoder', 1800, 1900, 100, 200, 'atcoder error')
      `);
      await client.execute(`
        INSERT INTO codeforces_account_stats (
          account_id,
          rating,
          max_rating,
          accepted_problem_count,
          accepted_problem_count_in_month,
          last_online_at,
          fetched_at,
          last_attempted_at,
          last_error
        ) VALUES ('codeforces', 1700, 1800, 300, 40, 90, 100, 200, 'codeforces error')
      `);
      await client.execute(`
        INSERT INTO luogu_account_stats (
          account_id,
          accepted_problem_count,
          accepted_weighted_score,
          average_accepted_difficulty,
          fetched_at,
          last_attempted_at,
          last_error
        ) VALUES ('luogu', 200, 1234, 4.5, 100, 200, 'luogu error')
      `);
      await client.execute(`
        INSERT INTO nowcoder_account_stats (
          account_id,
          rating,
          accepted_problem_count,
          fetched_at,
          last_attempted_at,
          last_error
        ) VALUES ('nowcoder', 1600.5, 150, 100, 200, 'nowcoder error')
      `);
      await client.execute(`
        INSERT INTO user_award_sync (
          user_id,
          source,
          fetched_at,
          last_attempted_at,
          last_error
        ) VALUES ('member', 'luogu', 100, 200, 'award error')
      `);

      await runMigration(client, "0002_drop-refresh-last-attempted-at.sql");

      const atcoder = await client.execute(`
        SELECT rating, recent_performance_average AS recentPerformanceAverage,
          fetched_at AS fetchedAt, last_error AS lastError
        FROM atcoder_account_stats
      `);
      const codeforces = await client.execute(`
        SELECT rating, max_rating AS maxRating,
          accepted_problem_count AS acceptedProblemCount,
          accepted_problem_count_in_month AS acceptedProblemCountInMonth,
          last_online_at AS lastOnlineAt, fetched_at AS fetchedAt,
          last_error AS lastError
        FROM codeforces_account_stats
      `);
      const luogu = await client.execute(`
        SELECT accepted_problem_count AS acceptedProblemCount,
          accepted_weighted_score AS acceptedWeightedScore,
          average_accepted_difficulty AS averageAcceptedDifficulty,
          fetched_at AS fetchedAt, last_error AS lastError
        FROM luogu_account_stats
      `);
      const nowcoder = await client.execute(`
        SELECT rating, accepted_problem_count AS acceptedProblemCount,
          fetched_at AS fetchedAt, last_error AS lastError
        FROM nowcoder_account_stats
      `);
      const awardSync = await client.execute(`
        SELECT user_id AS userId, source, fetched_at AS fetchedAt,
          last_error AS lastError
        FROM user_award_sync
      `);

      expect(
        atcoder.rows.map((row) => ({
          fetchedAt: row.fetchedAt,
          lastError: row.lastError,
          rating: row.rating,
          recentPerformanceAverage: row.recentPerformanceAverage,
        }))
      ).toEqual([
        {
          fetchedAt: 100,
          lastError: "atcoder error",
          rating: 1800,
          recentPerformanceAverage: 1900,
        },
      ]);
      expect(
        codeforces.rows.map((row) => ({
          acceptedProblemCount: row.acceptedProblemCount,
          acceptedProblemCountInMonth: row.acceptedProblemCountInMonth,
          fetchedAt: row.fetchedAt,
          lastError: row.lastError,
          lastOnlineAt: row.lastOnlineAt,
          maxRating: row.maxRating,
          rating: row.rating,
        }))
      ).toEqual([
        {
          acceptedProblemCount: 300,
          acceptedProblemCountInMonth: 40,
          fetchedAt: 100,
          lastError: "codeforces error",
          lastOnlineAt: 90,
          maxRating: 1800,
          rating: 1700,
        },
      ]);
      expect(
        luogu.rows.map((row) => ({
          acceptedProblemCount: row.acceptedProblemCount,
          acceptedWeightedScore: row.acceptedWeightedScore,
          averageAcceptedDifficulty: row.averageAcceptedDifficulty,
          fetchedAt: row.fetchedAt,
          lastError: row.lastError,
        }))
      ).toEqual([
        {
          acceptedProblemCount: 200,
          acceptedWeightedScore: 1234,
          averageAcceptedDifficulty: 4.5,
          fetchedAt: 100,
          lastError: "luogu error",
        },
      ]);
      expect(
        nowcoder.rows.map((row) => ({
          acceptedProblemCount: row.acceptedProblemCount,
          fetchedAt: row.fetchedAt,
          lastError: row.lastError,
          rating: row.rating,
        }))
      ).toEqual([
        {
          acceptedProblemCount: 150,
          fetchedAt: 100,
          lastError: "nowcoder error",
          rating: 1600.5,
        },
      ]);
      expect(
        awardSync.rows.map((row) => ({
          fetchedAt: row.fetchedAt,
          lastError: row.lastError,
          source: row.source,
          userId: row.userId,
        }))
      ).toEqual([
        {
          fetchedAt: 100,
          lastError: "award error",
          source: "luogu",
          userId: "member",
        },
      ]);

      for (const table of [
        "atcoder_account_stats",
        "codeforces_account_stats",
        "luogu_account_stats",
        "nowcoder_account_stats",
        "user_award_sync",
      ]) {
        const columns = await client.execute(`pragma table_info(${table})`);
        expect(
          columns.rows.some((column) => column.name === "last_attempted_at")
        ).toBeFalse();
      }

      const foreignKeyErrors = await client.execute("pragma foreign_key_check");
      expect(foreignKeyErrors.rows).toHaveLength(0);
    } finally {
      client.close();
    }
  });
});
