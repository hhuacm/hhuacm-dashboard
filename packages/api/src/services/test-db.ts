import { tmpdir } from "node:os";
import path from "node:path";
import { account, user } from "@hhuacm-dashboard/db/schema/auth";
import { codeforcesAccountStats } from "@hhuacm-dashboard/db/schema/codeforces-account-stats";
import { currentMember } from "@hhuacm-dashboard/db/schema/current-member";
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
import { refreshRequest } from "@hhuacm-dashboard/db/schema/refresh-request";
import { siteSetting } from "@hhuacm-dashboard/db/schema/site-setting";
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
  username text not null unique,
  display_username text,
  role text default 'user' not null,
  created_at integer default (cast(unixepoch('subsecond') * 1000 as integer)) not null,
  updated_at integer default (cast(unixepoch('subsecond') * 1000 as integer)) not null
)
`,
  `
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
`,
  `
create table user_profile (
  user_id text primary key not null,
  real_name text,
  grade text,
  student_id text,
  major text,
  member_status text default 'selection' not null
)
`,
  `
create view current_member as
select
  user.id as user_id,
  user.username as username,
  user_profile.real_name as real_name,
  user_profile.grade as grade,
  user_profile.student_id as student_id,
  user_profile.major as major
from user
left join user_profile on user_profile.user_id = user.id
where coalesce(user_profile.member_status, 'selection') in ('selection', 'active')
`,
  `
create table user_oj_account (
  id text primary key not null,
  user_id text not null,
  platform text not null,
  handle text not null,
  profile_url text default '' not null
)
`,
  `
create table codeforces_account_stats (
  account_id text primary key not null,
  rating integer,
  max_rating integer,
  accepted_problem_count integer,
  accepted_problem_count_in_month integer,
  last_online_at integer,
  fetched_at integer,
  last_attempted_at integer not null,
  last_error text
)
`,
  `
create table luogu_account_stats (
  account_id text primary key not null,
  accepted_problem_count integer,
  accepted_weighted_score integer,
  average_accepted_difficulty real,
  fetched_at integer,
  last_attempted_at integer not null,
  last_error text
)
`,
  `
create table luogu_accepted_problem (
  account_id text not null,
  pid text not null,
  name text not null,
  type text not null,
  difficulty integer,
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
  problem_set_id text not null references problem_set(id) on delete cascade,
  pid text not null,
  title text,
  difficulty integer,
  sort_order integer not null,
  primary key (problem_set_id, pid)
)
`,
  `
create table refresh_request (
  kind text not null,
  target_id text not null,
  created_at integer default (cast(unixepoch('subsecond') * 1000 as integer)) not null,
  primary key (kind, target_id)
)
`,
  `
create table user_award (
  user_id text not null,
  source text not null,
  year integer not null,
  contest text not null,
  event text,
  level text not null,
  sort_order integer not null,
  primary key (user_id, source, sort_order)
)
`,
  `
create table user_award_sync (
  user_id text not null,
  source text not null,
  fetched_at integer,
  last_attempted_at integer not null,
  last_error text,
  primary key (user_id, source)
)
`,
  `
create table site_setting (
  key text primary key not null,
  value text not null,
  updated_at integer default (cast(unixepoch('subsecond') * 1000 as integer)) not null
)
`,
] as const;

const testSchema = {
  account,
  codeforcesAccountStats,
  currentMember,
  luoguAcceptedProblem,
  luoguAccountStats,
  problemSet,
  problemSetProblem,
  refreshRequest,
  siteSetting,
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
