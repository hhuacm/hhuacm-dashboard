// Temporary one-off import script for migrating legacy ranklist users.
// This is not intended to become a long-term production workflow.
import { Buffer } from "node:buffer";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { createDb } from "@hhuacm-dashboard/db";
import { account, user } from "@hhuacm-dashboard/db/schema/auth";
import { userOjAccount } from "@hhuacm-dashboard/db/schema/oj-account";
import {
  memberStatuses,
  userProfile,
} from "@hhuacm-dashboard/db/schema/profile";
import { hashPassword } from "better-auth/crypto";
import dotenv from "dotenv";
import { and, eq, inArray, or } from "drizzle-orm";

const defaultPassword = "12345678";
const emailDomain = "hhuacm.local";
const minimumCsvColumns = 4;
const minimumPasswordLength = 8;
const previewLimit = 12;
const twoDigitGradePattern = /^\d{2}$/u;
const fourDigitGradePattern = /^\d{4}$/u;
const legacySources = ["local", "s3"] as const;

const workspaceRoot = fileURLToPath(new URL("../../../../", import.meta.url));
const defaultLegacyProjectPath = path.resolve(
  workspaceRoot,
  "../hhuacm-ranklist-server"
);

dotenv.config({
  path: path.join(workspaceRoot, "apps/server/.env"),
});

interface ImportCandidate {
  email: string;
  grade: null | string;
  handle: string;
  major: null | string;
  normalizedHandle: string;
  realName: null | string;
  username: string;
}

interface ExistingUser {
  email: string;
  id: string;
  username: null | string;
}

interface ExistingCodeforcesAccount {
  handle: string;
  id: string;
  normalizedHandle: string;
  userId: string;
}

interface PlannedImport {
  candidate: ImportCandidate;
  createCodeforcesAccount: boolean;
  createProfile: boolean;
  createUser: boolean;
  skipReason: null | string;
  userId: string;
}

interface LoadedRows {
  inputCount: number;
  rows: string[][];
  sourceLabel: string;
}

type Database = ReturnType<typeof createDb>;
type LegacySource = (typeof legacySources)[number];

const writeLine = (message = "") => {
  process.stdout.write(`${message}\n`);
};

const writeError = (message: string) => {
  process.stderr.write(`${message}\n`);
};

const getArgumentValue = (name: string) => {
  const args = process.argv.slice(2);
  const prefix = `${name}=`;
  const valueWithEquals = args.find((arg) => arg.startsWith(prefix));

  if (valueWithEquals) {
    return valueWithEquals.slice(prefix.length);
  }

  const nameIndex = args.indexOf(name);
  if (nameIndex === -1) {
    return null;
  }

  return args[nameIndex + 1] ?? null;
};

const hasArgument = (name: string) => process.argv.slice(2).includes(name);

const printHelp = () => {
  writeLine(
    "Import users from the legacy HHU ACM Codeforces ranklist CSV files."
  );
  writeLine();
  writeLine("Usage:");
  writeLine("  bun run import:ranklist-users");
  writeLine("  bun run import:ranklist-users -- --write");
  writeLine();
  writeLine("Options:");
  writeLine(
    "  --write                  Modify the database. Omit for dry-run."
  );
  writeLine(
    "  --source <path>          CSV file or directory. Overrides legacy source."
  );
  writeLine("  --legacy-source <source> local or s3. Default: s3.");
  writeLine("  --legacy-project <path>  Legacy ranklist server path.");
  writeLine("  --password <password>    Initial password. Default: 12345678.");
  writeLine(
    "  --member-status <status> Initial profile status. Default: selection."
  );
};

const normalizeGrade = (grade: string) => {
  if (!grade) {
    return null;
  }

  if (twoDigitGradePattern.test(grade)) {
    return `20${grade}级`;
  }

  if (fourDigitGradePattern.test(grade)) {
    return `${grade}级`;
  }

  return grade;
};

const toLegacySource = (value: string): LegacySource => {
  if (legacySources.includes(value as LegacySource)) {
    return value as LegacySource;
  }

  throw new Error(`Invalid legacy source: ${value}`);
};

const endCsvRow = (rows: string[][], row: string[], field: string) => {
  const nextRow = [...row, field];
  const hasContent = nextRow.some((cell) => cell.length > 0);

  if (hasContent) {
    rows.push(nextRow);
  }
};

const parseCsv = (content: string) => {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let isQuoted = false;
  let index = 0;

  while (index < content.length) {
    const character = content[index];

    if (character === '"') {
      if (isQuoted && content[index + 1] === '"') {
        field += '"';
        index += 2;
        continue;
      }

      isQuoted = !isQuoted;
      index += 1;
      continue;
    }

    if (character === "," && !isQuoted) {
      row.push(field);
      field = "";
      index += 1;
      continue;
    }

    const isLineBreak = character === "\n" || character === "\r";
    if (isLineBreak && !isQuoted) {
      endCsvRow(rows, row, field);
      row = [];
      field = "";

      if (character === "\r" && content[index + 1] === "\n") {
        index += 2;
        continue;
      }

      index += 1;
      continue;
    }

    field += character;
    index += 1;
  }

  endCsvRow(rows, row, field);

  return rows;
};

const listCsvFiles = async (sourcePath: string) => {
  const sourceStat = await stat(sourcePath);

  if (!sourceStat.isDirectory()) {
    return [sourcePath];
  }

  const entries = await readdir(sourcePath);
  return entries
    .filter((entry) => entry.endsWith(".csv"))
    .sort((left, right) => left.localeCompare(right))
    .map((entry) => path.join(sourcePath, entry));
};

const loadRanklistRows = async (sourcePath: string) => {
  const files = await listCsvFiles(sourcePath);
  const rows: string[][] = [];

  for (const file of files) {
    const content = await readFile(file, "utf-8");
    rows.push(...parseCsv(content));
  }

  return {
    inputCount: files.length,
    rows,
    sourceLabel: sourcePath,
  };
};

const legacyLoaderScript = `
import json
import sys

from storage import load_csv_from_local, load_csv_from_s3_bucket

source = sys.argv[1]
rows = load_csv_from_s3_bucket() if source == "s3" else load_csv_from_local()
print(json.dumps(rows, ensure_ascii=False))
`;

const assertRows = (value: unknown): string[][] => {
  if (!Array.isArray(value)) {
    throw new Error("Legacy ranklist loader returned non-array data");
  }

  const rows: string[][] = [];

  for (const row of value) {
    if (!Array.isArray(row)) {
      throw new Error("Legacy ranklist loader returned an invalid row");
    }

    rows.push(row.map((cell) => String(cell)));
  }

  return rows;
};

const loadLegacyRanklistRows = async (
  legacyProjectPath: string,
  legacySource: LegacySource
): Promise<LoadedRows> => {
  const child = spawn(
    "uv",
    ["run", "python", "-c", legacyLoaderScript, legacySource],
    {
      cwd: legacyProjectPath,
      stdio: ["ignore", "pipe", "pipe"],
    }
  );
  const stdoutChunks: Buffer[] = [];
  const stderrChunks: Buffer[] = [];

  child.stdout.on("data", (chunk: Buffer) => {
    stdoutChunks.push(chunk);
  });
  child.stderr.on("data", (chunk: Buffer) => {
    stderrChunks.push(chunk);
  });

  const exitCode = await new Promise<number | null>((resolve, reject) => {
    child.on("error", reject);
    child.on("close", resolve);
  });

  const stdout = Buffer.concat(stdoutChunks).toString("utf-8");
  const stderr = Buffer.concat(stderrChunks).toString("utf-8").trim();

  if (exitCode !== 0) {
    throw new Error(
      `Legacy ranklist loader failed with exit code ${exitCode}${
        stderr ? `: ${stderr}` : ""
      }`
    );
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(stdout);
  } catch (error) {
    throw new Error(
      `Legacy ranklist loader returned invalid JSON: ${
        error instanceof Error ? error.message : "unknown parse error"
      }`
    );
  }

  return {
    inputCount: 1,
    rows: assertRows(parsed),
    sourceLabel: `${legacyProjectPath} (${legacySource})`,
  };
};

const getCell = (row: string[], index: number) => row[index]?.trim() ?? "";

const parseCandidates = (rows: string[][]): ImportCandidate[] => {
  const candidates: ImportCandidate[] = [];

  for (const row of rows) {
    if (row.length < minimumCsvColumns) {
      continue;
    }

    const realName = getCell(row, 0);
    const grade = getCell(row, 1);
    const major = getCell(row, 2);
    const handle = getCell(row, 3);

    if (!handle) {
      continue;
    }

    const normalizedHandle = handle.toLowerCase();

    candidates.push({
      email: `${normalizedHandle}@${emailDomain}`,
      grade: normalizeGrade(grade),
      handle,
      major: major || null,
      normalizedHandle,
      realName: realName || null,
      username: handle,
    });
  }

  return candidates;
};

const assertNoDuplicateHandles = (candidates: ImportCandidate[]) => {
  const seenHandles = new Map<string, string>();
  const duplicates: string[] = [];

  for (const candidate of candidates) {
    const previousName = seenHandles.get(candidate.normalizedHandle);

    if (previousName) {
      duplicates.push(
        `${candidate.handle} (${previousName}, ${candidate.realName ?? "-"})`
      );
      continue;
    }

    seenHandles.set(candidate.normalizedHandle, candidate.realName ?? "-");
  }

  if (duplicates.length > 0) {
    throw new Error(
      `Duplicate Codeforces handles in source: ${duplicates.join(", ")}`
    );
  }
};

const buildProfileUrl = (handle: string) =>
  `https://codeforces.com/profile/${encodeURIComponent(handle)}`;

const findTargetUser = (
  candidate: ImportCandidate,
  usersByEmail: Map<string, ExistingUser>,
  usersByUsername: Map<string, ExistingUser>
) => {
  const userByEmail = usersByEmail.get(candidate.email) ?? null;
  const userByUsername = usersByUsername.get(candidate.username) ?? null;

  if (userByEmail && userByUsername && userByEmail.id !== userByUsername.id) {
    return {
      skipReason: `username ${candidate.username} and email ${candidate.email} belong to different users`,
      user: null,
    };
  }

  return {
    skipReason: null,
    user: userByUsername ?? userByEmail,
  };
};

const planImport = ({
  candidates,
  existingCodeforcesByHandle,
  existingCodeforcesByUserId,
  existingProfileUserIds,
  usersByEmail,
  usersByUsername,
}: {
  candidates: ImportCandidate[];
  existingCodeforcesByHandle: Map<string, ExistingCodeforcesAccount>;
  existingCodeforcesByUserId: Map<string, ExistingCodeforcesAccount>;
  existingProfileUserIds: Set<string>;
  usersByEmail: Map<string, ExistingUser>;
  usersByUsername: Map<string, ExistingUser>;
}) => {
  const plans: PlannedImport[] = [];

  for (const candidate of candidates) {
    const targetUser = findTargetUser(candidate, usersByEmail, usersByUsername);

    if (targetUser.skipReason) {
      plans.push({
        candidate,
        createCodeforcesAccount: false,
        createProfile: false,
        createUser: false,
        skipReason: targetUser.skipReason,
        userId: "",
      });
      continue;
    }

    const existingUser = targetUser.user;
    const existingCodeforcesForHandle = existingCodeforcesByHandle.get(
      candidate.normalizedHandle
    );

    if (
      existingCodeforcesForHandle &&
      existingUser &&
      existingCodeforcesForHandle.userId !== existingUser.id
    ) {
      plans.push({
        candidate,
        createCodeforcesAccount: false,
        createProfile: false,
        createUser: false,
        skipReason: `Codeforces handle ${candidate.handle} is already bound to another user`,
        userId: existingUser.id,
      });
      continue;
    }

    if (existingCodeforcesForHandle && !existingUser) {
      plans.push({
        candidate,
        createCodeforcesAccount: false,
        createProfile: false,
        createUser: false,
        skipReason: `Codeforces handle ${candidate.handle} already exists without matching username/email`,
        userId: existingCodeforcesForHandle.userId,
      });
      continue;
    }

    const existingCodeforcesForUser = existingUser
      ? existingCodeforcesByUserId.get(existingUser.id)
      : null;

    if (
      existingCodeforcesForUser &&
      existingCodeforcesForUser.normalizedHandle !== candidate.normalizedHandle
    ) {
      if (!existingUser) {
        throw new Error(`Unexpected missing user for ${candidate.username}`);
      }

      plans.push({
        candidate,
        createCodeforcesAccount: false,
        createProfile: false,
        createUser: false,
        skipReason: `user already has Codeforces handle ${existingCodeforcesForUser.handle}`,
        userId: existingUser.id,
      });
      continue;
    }

    const userId = existingUser?.id ?? randomUUID();

    plans.push({
      candidate,
      createCodeforcesAccount: !(
        existingCodeforcesForHandle || existingCodeforcesForUser
      ),
      createProfile: !existingProfileUserIds.has(userId),
      createUser: !existingUser,
      skipReason: null,
      userId,
    });
  }

  return plans;
};

const printPlan = (plans: PlannedImport[], isWriteMode: boolean) => {
  const activePlans = plans.filter((plan) => !plan.skipReason);
  const skippedPlans = plans.filter((plan) => plan.skipReason);
  const userCreates = activePlans.filter((plan) => plan.createUser).length;
  const profileCreates = activePlans.filter(
    (plan) => plan.createProfile
  ).length;
  const accountCreates = activePlans.filter(
    (plan) => plan.createCodeforcesAccount
  ).length;
  const reusedUsers = activePlans.length - userCreates;

  writeLine(isWriteMode ? "Import mode: write" : "Import mode: dry-run");
  writeLine(`Candidates: ${plans.length}`);
  writeLine(`Users to create: ${userCreates}`);
  writeLine(`Existing users to reuse: ${reusedUsers}`);
  writeLine(`Profiles to create: ${profileCreates}`);
  writeLine(`Codeforces accounts to create: ${accountCreates}`);
  writeLine(`Skipped: ${skippedPlans.length}`);

  if (skippedPlans.length > 0) {
    writeLine();
    writeLine("Skipped candidates:");
    for (const plan of skippedPlans) {
      writeLine(`- ${plan.candidate.handle}: ${plan.skipReason ?? "unknown"}`);
    }
  }

  writeLine();
  writeLine("Preview:");
  for (const plan of activePlans.slice(0, previewLimit)) {
    const action = plan.createUser ? "create" : "reuse";
    writeLine(
      `- ${action} ${plan.candidate.username} <${plan.candidate.email}> CF=${plan.candidate.handle}`
    );
  }

  if (activePlans.length > previewLimit) {
    writeLine(`- ... ${activePlans.length - previewLimit} more`);
  }
};

const importPlannedUsers = async (
  db: Database,
  plans: PlannedImport[],
  password: string,
  memberStatus: (typeof memberStatuses)[number]
) => {
  const activePlans = plans.filter((plan) => !plan.skipReason);
  const passwordHashesByUserId = new Map<string, string>();

  for (const plan of activePlans) {
    if (plan.createUser) {
      passwordHashesByUserId.set(plan.userId, await hashPassword(password));
    }
  }

  await db.transaction(async (tx) => {
    const now = new Date();

    for (const plan of activePlans) {
      const { candidate } = plan;

      if (plan.createUser) {
        const passwordHash = passwordHashesByUserId.get(plan.userId);

        if (!passwordHash) {
          throw new Error(`Missing password hash for ${candidate.username}`);
        }

        await tx.insert(user).values({
          createdAt: now,
          displayUsername: candidate.username,
          email: candidate.email,
          emailVerified: true,
          id: plan.userId,
          name: candidate.username,
          role: "member",
          updatedAt: now,
          username: candidate.username,
        });

        await tx.insert(account).values({
          accountId: plan.userId,
          createdAt: now,
          id: randomUUID(),
          password: passwordHash,
          providerId: "credential",
          updatedAt: now,
          userId: plan.userId,
        });
      }

      if (plan.createProfile) {
        await tx.insert(userProfile).values({
          createdAt: now,
          grade: candidate.grade,
          major: candidate.major,
          memberStatus,
          realName: candidate.realName,
          updatedAt: now,
          userId: plan.userId,
        });
      }

      if (plan.createCodeforcesAccount) {
        await tx.insert(userOjAccount).values({
          createdAt: now,
          handle: candidate.handle,
          id: randomUUID(),
          normalizedHandle: candidate.normalizedHandle,
          platform: "codeforces",
          profileUrl: buildProfileUrl(candidate.handle),
          updatedAt: now,
          userId: plan.userId,
        });
      }
    }
  });
};

const main = async () => {
  if (hasArgument("--help") || hasArgument("-h")) {
    printHelp();
    return;
  }

  const sourceArg = getArgumentValue("--source");
  const sourcePath = sourceArg ? path.resolve(sourceArg) : null;
  const legacyProjectPath = path.resolve(
    getArgumentValue("--legacy-project") ?? defaultLegacyProjectPath
  );
  const legacySource = toLegacySource(
    getArgumentValue("--legacy-source") ?? "s3"
  );
  const password = getArgumentValue("--password") ?? defaultPassword;
  const memberStatusValue = getArgumentValue("--member-status") ?? "selection";
  const isWriteMode = hasArgument("--write");

  if (password.length < minimumPasswordLength) {
    throw new Error(
      `Password must be at least ${minimumPasswordLength} characters`
    );
  }

  if (
    !memberStatuses.includes(
      memberStatusValue as (typeof memberStatuses)[number]
    )
  ) {
    throw new Error(`Invalid member status: ${memberStatusValue}`);
  }

  const memberStatus = memberStatusValue as (typeof memberStatuses)[number];
  const { createDb } = await import("@hhuacm-dashboard/db");
  const db = createDb();
  const { inputCount, rows, sourceLabel } = sourcePath
    ? await loadRanklistRows(sourcePath)
    : await loadLegacyRanklistRows(legacyProjectPath, legacySource);
  const candidates = parseCandidates(rows);

  assertNoDuplicateHandles(candidates);

  const usernames = candidates.map((candidate) => candidate.username);
  const emails = candidates.map((candidate) => candidate.email);
  const normalizedHandles = candidates.map(
    (candidate) => candidate.normalizedHandle
  );

  const existingUsers = await db
    .select({
      email: user.email,
      id: user.id,
      username: user.username,
    })
    .from(user)
    .where(or(inArray(user.username, usernames), inArray(user.email, emails)));

  const existingCodeforcesAccounts = await db
    .select({
      handle: userOjAccount.handle,
      id: userOjAccount.id,
      normalizedHandle: userOjAccount.normalizedHandle,
      userId: userOjAccount.userId,
    })
    .from(userOjAccount)
    .where(
      and(
        eq(userOjAccount.platform, "codeforces"),
        inArray(userOjAccount.normalizedHandle, normalizedHandles)
      )
    );

  const existingUserIds = existingUsers.map((existingUser) => existingUser.id);
  const existingProfiles =
    existingUserIds.length === 0
      ? []
      : await db
          .select({ userId: userProfile.userId })
          .from(userProfile)
          .where(inArray(userProfile.userId, existingUserIds));

  const existingUserCodeforcesAccounts =
    existingUserIds.length === 0
      ? []
      : await db
          .select({
            handle: userOjAccount.handle,
            id: userOjAccount.id,
            normalizedHandle: userOjAccount.normalizedHandle,
            userId: userOjAccount.userId,
          })
          .from(userOjAccount)
          .where(
            and(
              eq(userOjAccount.platform, "codeforces"),
              inArray(userOjAccount.userId, existingUserIds)
            )
          );

  const usersByEmail = new Map(
    existingUsers.map((existingUser) => [existingUser.email, existingUser])
  );
  const usersByUsername = new Map(
    existingUsers
      .filter((existingUser) => existingUser.username)
      .map((existingUser) => [existingUser.username ?? "", existingUser])
  );
  const existingCodeforcesByHandle = new Map(
    existingCodeforcesAccounts.map((existingAccount) => [
      existingAccount.normalizedHandle,
      existingAccount,
    ])
  );
  const existingCodeforcesByUserId = new Map(
    existingUserCodeforcesAccounts.map((existingAccount) => [
      existingAccount.userId,
      existingAccount,
    ])
  );
  const existingProfileUserIds = new Set(
    existingProfiles.map((profile) => profile.userId)
  );

  const plans = planImport({
    candidates,
    existingCodeforcesByHandle,
    existingCodeforcesByUserId,
    existingProfileUserIds,
    usersByEmail,
    usersByUsername,
  });

  writeLine(`Source: ${sourceLabel}`);
  writeLine(`Inputs: ${inputCount}`);
  writeLine(`CSV rows: ${rows.length}`);
  printPlan(plans, isWriteMode);

  if (!isWriteMode) {
    writeLine();
    writeLine("Dry-run only. Re-run with --write to modify the database.");
    return;
  }

  await importPlannedUsers(db, plans, password, memberStatus);
  writeLine();
  writeLine("Import completed.");
};

try {
  await main();
} catch (error) {
  writeError(error instanceof Error ? error.message : "Import failed");
  process.exitCode = 1;
}
