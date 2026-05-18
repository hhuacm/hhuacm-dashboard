import { user } from "@hhuacm-dashboard/db/schema/auth";
import { codeforcesAccountStats } from "@hhuacm-dashboard/db/schema/codeforces-account-stats";
import { userOjAccount } from "@hhuacm-dashboard/db/schema/oj-account";
import { userProfile } from "@hhuacm-dashboard/db/schema/profile";
import { refreshJob } from "@hhuacm-dashboard/db/schema/refresh-job";
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
create table refresh_job (
  id text primary key not null,
  kind text not null,
  target_type text not null,
  target_id text not null,
  status text default 'pending' not null,
  created_at integer default (cast(unixepoch('subsecond') * 1000 as integer)) not null
)
`,
] as const;

const testSchema = {
  codeforcesAccountStats,
  refreshJob,
  user,
  userOjAccount,
  userProfile,
} as const;

export const createServiceTestDb = async () => {
  const client = createClient({ url: ":memory:" });

  for (const statement of createTableStatements) {
    await client.execute(statement);
  }

  return drizzle({
    client,
    schema: testSchema,
  }) as unknown as Context["db"];
};
