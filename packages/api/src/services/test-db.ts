import { tmpdir } from "node:os";
import path from "node:path";
import { user } from "@hhuacm-dashboard/db/schema/auth";
import { codeforcesAccountStats } from "@hhuacm-dashboard/db/schema/codeforces-account-stats";
import {
  luoguAcceptedProblem,
  luoguAccountStats,
} from "@hhuacm-dashboard/db/schema/luogu-account-stats";
import { userOjAccount } from "@hhuacm-dashboard/db/schema/oj-account";
import {
  problemSet,
  problemSetProblem,
} from "@hhuacm-dashboard/db/schema/problem-set";
import { userProfile } from "@hhuacm-dashboard/db/schema/profile";
import { refreshJob } from "@hhuacm-dashboard/db/schema/refresh-job";
import {
  userAward,
  userAwardSync,
} from "@hhuacm-dashboard/db/schema/user-award";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";

import type { Context } from "../context";

const createTableStatements = [
  `
create table user (
  id text primary key not null,
  name text not null,
  email text not null unique,
  email_verified integer default 0 not null,
  image text,
  username text unique,
  display_username text,
  role text default 'member' not null,
  created_at integer default (cast(unixepoch('subsecond') * 1000 as integer)) not null,
  updated_at integer default (cast(unixepoch('subsecond') * 1000 as integer)) not null
)
`,
  `
create table user_profile (
  user_id text primary key not null,
  real_name text,
  grade text,
  student_id text,
  major text,
  member_status text default 'selection' not null,
  created_at integer default (cast(unixepoch('subsecond') * 1000 as integer)) not null,
  updated_at integer default (cast(unixepoch('subsecond') * 1000 as integer)) not null
)
`,
  `
create table user_oj_account (
  id text primary key not null,
  user_id text not null,
  platform text not null,
  handle text not null,
  normalized_handle text not null,
  profile_url text default '' not null,
  created_at integer default (cast(unixepoch('subsecond') * 1000 as integer)) not null,
  updated_at integer default (cast(unixepoch('subsecond') * 1000 as integer)) not null
)
`,
  `
create table codeforces_account_stats (
  account_id text primary key not null,
  handle text not null,
  rating integer,
  max_rating integer,
  accepted_problem_count integer,
  accepted_problem_count_in_month integer,
  last_online_at integer,
  fetched_at integer,
  last_attempted_at integer not null,
  last_error text,
  created_at integer default (cast(unixepoch('subsecond') * 1000 as integer)) not null,
  updated_at integer default (cast(unixepoch('subsecond') * 1000 as integer)) not null
)
`,
  `
create table luogu_account_stats (
  account_id text primary key not null,
  uid integer,
  accepted_problem_count integer,
  accepted_weighted_score integer,
  average_accepted_difficulty real,
  fetched_at integer,
  last_attempted_at integer not null,
  last_error text,
  created_at integer default (cast(unixepoch('subsecond') * 1000 as integer)) not null,
  updated_at integer default (cast(unixepoch('subsecond') * 1000 as integer)) not null
)
`,
  `
create table luogu_accepted_problem (
  account_id text not null,
  pid text not null,
  name text not null,
  type text not null,
  difficulty integer,
  first_seen_at integer not null,
  last_seen_at integer not null,
  primary key (account_id, pid)
)
`,
  `
create table problem_set (
  id text primary key not null,
  title text not null,
  description_markdown text default '' not null,
  created_at integer default (cast(unixepoch('subsecond') * 1000 as integer)) not null,
  updated_at integer default (cast(unixepoch('subsecond') * 1000 as integer)) not null
)
`,
  `
create table problem_set_problem (
  id text primary key not null,
  problem_set_id text not null references problem_set(id) on delete cascade,
  pid text not null,
  title text not null,
  difficulty integer,
  sort_order integer not null,
  created_at integer default (cast(unixepoch('subsecond') * 1000 as integer)) not null,
  updated_at integer default (cast(unixepoch('subsecond') * 1000 as integer)) not null,
  unique (problem_set_id, pid)
)
`,
  `
create table refresh_job (
  id text primary key not null,
  kind text not null,
  target_type text not null,
  target_id text not null,
  status text default 'pending' not null,
  created_at integer default (cast(unixepoch('subsecond') * 1000 as integer)) not null
)
`,
  `
create table user_award (
  id text primary key not null,
  user_id text not null,
  source text not null,
  source_handle text not null,
  source_profile_url text not null,
  year integer not null,
  contest text not null,
  event text,
  level text not null,
  sort_order integer not null,
  fetched_at integer not null,
  created_at integer default (cast(unixepoch('subsecond') * 1000 as integer)) not null,
  updated_at integer default (cast(unixepoch('subsecond') * 1000 as integer)) not null
)
`,
  `
create table user_award_sync (
  user_id text not null,
  source text not null,
  fetched_at integer,
  last_attempted_at integer not null,
  last_error text,
  created_at integer default (cast(unixepoch('subsecond') * 1000 as integer)) not null,
  updated_at integer default (cast(unixepoch('subsecond') * 1000 as integer)) not null,
  primary key (user_id, source)
)
`,
] as const;

const testSchema = {
  codeforcesAccountStats,
  luoguAcceptedProblem,
  luoguAccountStats,
  problemSet,
  problemSetProblem,
  refreshJob,
  user,
  userAward,
  userAwardSync,
  userOjAccount,
  userProfile,
} as const;

export const createServiceTestDb = async () => {
  const client = createClient({
    url: `file:${path.join(
      tmpdir(),
      `hhuacm-service-test-${crypto.randomUUID()}.db`
    )}`,
  });

  await client.execute("pragma foreign_keys = on");

  for (const statement of createTableStatements) {
    await client.execute(statement);
  }

  return drizzle({
    client,
    schema: testSchema,
  }) as unknown as Context["db"];
};
