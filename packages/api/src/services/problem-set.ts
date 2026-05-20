import { user } from "@hhuacm-dashboard/db/schema/auth";
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
import {
  defaultMemberStatus,
  type MemberStatus,
} from "@hhuacm-dashboard/domain";
import { TRPCError } from "@trpc/server";
import { and, asc, count, eq, inArray, sql } from "drizzle-orm";

import type { Context } from "../context";
import { publicActivityMemberStatuses } from "./member-status";
import { refreshDefaults } from "./refresh/constants";
import {
  enqueueLuoguAccountStatsRefresh,
  enqueueLuoguProblemDetailsRefresh,
} from "./refresh/queue";

type Database = Context["db"];

export interface ProblemSetInput {
  descriptionMarkdown: string;
  pids: string[];
  title: string;
}

export interface ProblemSetUpdateInput {
  descriptionMarkdown?: string;
  id: string;
  pids?: string[];
  title?: string;
}

type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];

const pidPattern = /^[A-Z]\d+[A-Z0-9]*$/;

const problemSetFields = {
  createdAt: problemSet.createdAt,
  descriptionMarkdown: problemSet.descriptionMarkdown,
  id: problemSet.id,
  title: problemSet.title,
  updatedAt: problemSet.updatedAt,
} as const;

const problemSetProblemFields = {
  difficulty: problemSetProblem.difficulty,
  id: problemSetProblem.id,
  pid: problemSetProblem.pid,
  sortOrder: problemSetProblem.sortOrder,
  title: problemSetProblem.title,
} as const;

const memberStatusExpression = sql<MemberStatus>`coalesce(${userProfile.memberStatus}, ${defaultMemberStatus})`;

const toIsoString = (date: Date) => date.toISOString();

const normalizePids = (pids: string[]) => {
  const normalizedPids = pids.map((pid) => pid.trim()).filter(Boolean);
  const seenPids = new Set<string>();

  for (const pid of normalizedPids) {
    if (!pidPattern.test(pid)) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Invalid Luogu PID: ${pid}`,
      });
    }

    if (seenPids.has(pid)) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Duplicate Luogu PID: ${pid}`,
      });
    }

    seenPids.add(pid);
  }

  if (normalizedPids.length === 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Problem set requires at least one problem",
    });
  }

  return normalizedPids;
};

const getProblemSetOrThrow = async (db: Database, id: string) => {
  const [item] = await db
    .select(problemSetFields)
    .from(problemSet)
    .where(eq(problemSet.id, id))
    .limit(1);

  if (!item) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: `Problem set does not exist: ${id}`,
    });
  }

  return item;
};

const getProblemSetProblems = (db: Database, problemSetId: string) =>
  db
    .select(problemSetProblemFields)
    .from(problemSetProblem)
    .where(eq(problemSetProblem.problemSetId, problemSetId))
    .orderBy(asc(problemSetProblem.sortOrder));

const getExistingProblemsByPid = async (
  tx: Tx,
  problemSetId: string,
  pids: string[]
) => {
  if (pids.length === 0) {
    return new Map<string, typeof problemSetProblem.$inferSelect>();
  }

  const existingProblems = await tx
    .select()
    .from(problemSetProblem)
    .where(
      and(
        eq(problemSetProblem.problemSetId, problemSetId),
        inArray(problemSetProblem.pid, pids)
      )
    );

  return new Map(
    existingProblems.map((problem) => [problem.pid, problem] as const)
  );
};

const enqueueProblemDetailsRefreshes = async (db: Database, pids: string[]) => {
  for (const pid of new Set(pids)) {
    await enqueueLuoguProblemDetailsRefresh(db, pid);
  }
};

const replaceProblemSetProblems = async (
  tx: Tx,
  input: {
    pids: string[];
    problemSetId: string;
  }
) => {
  const existingProblemsByPid = await getExistingProblemsByPid(
    tx,
    input.problemSetId,
    input.pids
  );

  await tx
    .delete(problemSetProblem)
    .where(eq(problemSetProblem.problemSetId, input.problemSetId));

  await tx.insert(problemSetProblem).values(
    input.pids.map((pid, sortOrder) => {
      const existingProblem = existingProblemsByPid.get(pid);

      return {
        difficulty: existingProblem?.difficulty ?? null,
        pid,
        problemSetId: input.problemSetId,
        sortOrder,
        title: existingProblem?.title ?? pid,
      };
    })
  );
};

const getCurrentLuoguAccount = async (db: Database, userId: null | string) => {
  if (!userId) {
    return null;
  }

  return (
    (
      await db
        .select({
          accountId: userOjAccount.id,
          fetchedAt: luoguAccountStats.fetchedAt,
          lastError: luoguAccountStats.lastError,
        })
        .from(userOjAccount)
        .leftJoin(
          luoguAccountStats,
          eq(luoguAccountStats.accountId, userOjAccount.id)
        )
        .where(
          and(
            eq(userOjAccount.userId, userId),
            eq(userOjAccount.platform, "luogu")
          )
        )
        .limit(1)
    )[0] ?? null
  );
};

const enqueueLuoguStatsRefreshIfNeeded = async (
  db: Database,
  account: Awaited<ReturnType<typeof getCurrentLuoguAccount>>
) => {
  if (!account) {
    return;
  }

  const now = Date.now();
  const fetchedAt = account.fetchedAt?.getTime() ?? null;
  const isFresh =
    fetchedAt !== null && now - fetchedAt < refreshDefaults.luoguStatsTtlMs;

  if (!isFresh) {
    await enqueueLuoguAccountStatsRefresh(db, account.accountId);
  }
};

const getAcceptedPids = async (
  db: Database,
  input: {
    accountId: string;
    pids: string[];
  }
) => {
  if (input.pids.length === 0) {
    return new Set<string>();
  }

  const acceptedProblems = await db
    .select({ pid: luoguAcceptedProblem.pid })
    .from(luoguAcceptedProblem)
    .where(
      and(
        eq(luoguAcceptedProblem.accountId, input.accountId),
        inArray(luoguAcceptedProblem.pid, input.pids)
      )
    );

  return new Set(acceptedProblems.map((problem) => problem.pid));
};

const attachAcceptedStatus = async (
  db: Database,
  input: {
    currentUserId: null | string;
    problems: Awaited<ReturnType<typeof getProblemSetProblems>>;
  }
) => {
  const currentLuoguAccount = await getCurrentLuoguAccount(
    db,
    input.currentUserId
  );

  await enqueueLuoguStatsRefreshIfNeeded(db, currentLuoguAccount);

  if (!currentLuoguAccount?.fetchedAt) {
    return input.problems.map((problem) => ({
      difficulty: problem.difficulty,
      pid: problem.pid,
      title: problem.title,
      accepted: null,
    }));
  }

  const acceptedPids = await getAcceptedPids(db, {
    accountId: currentLuoguAccount.accountId,
    pids: input.problems.map((problem) => problem.pid),
  });

  return input.problems.map((problem) => ({
    difficulty: problem.difficulty,
    pid: problem.pid,
    title: problem.title,
    accepted: acceptedPids.has(problem.pid),
  }));
};

export const listProblemSets = async (
  db: Database,
  input: { currentUserId: null | string }
) => {
  const rows = await db
    .select({
      createdAt: problemSet.createdAt,
      descriptionMarkdown: problemSet.descriptionMarkdown,
      id: problemSet.id,
      problemCount: count(problemSetProblem.id),
      title: problemSet.title,
      updatedAt: problemSet.updatedAt,
    })
    .from(problemSet)
    .leftJoin(
      problemSetProblem,
      eq(problemSetProblem.problemSetId, problemSet.id)
    )
    .groupBy(problemSet.id)
    .orderBy(asc(problemSet.createdAt), asc(problemSet.id));

  const currentLuoguAccount = await getCurrentLuoguAccount(
    db,
    input.currentUserId
  );

  await enqueueLuoguStatsRefreshIfNeeded(db, currentLuoguAccount);

  if (!currentLuoguAccount?.fetchedAt) {
    return rows.map((row) => ({
      completedProblemCount: null,
      createdAt: toIsoString(row.createdAt),
      descriptionMarkdown: row.descriptionMarkdown,
      id: row.id,
      problemCount: row.problemCount,
      title: row.title,
      updatedAt: toIsoString(row.updatedAt),
    }));
  }

  const acceptedRows = await db
    .select({
      problemSetId: problemSetProblem.problemSetId,
    })
    .from(problemSetProblem)
    .innerJoin(
      luoguAcceptedProblem,
      and(
        eq(luoguAcceptedProblem.pid, problemSetProblem.pid),
        eq(luoguAcceptedProblem.accountId, currentLuoguAccount.accountId)
      )
    );
  const completedCounts = new Map<string, number>();

  for (const row of acceptedRows) {
    completedCounts.set(
      row.problemSetId,
      (completedCounts.get(row.problemSetId) ?? 0) + 1
    );
  }

  return rows.map((row) => ({
    completedProblemCount: completedCounts.get(row.id) ?? 0,
    createdAt: toIsoString(row.createdAt),
    descriptionMarkdown: row.descriptionMarkdown,
    id: row.id,
    problemCount: row.problemCount,
    title: row.title,
    updatedAt: toIsoString(row.updatedAt),
  }));
};

export const getProblemSet = async (
  db: Database,
  input: { currentUserId: null | string; id: string }
) => {
  const item = await getProblemSetOrThrow(db, input.id);
  const problems = await getProblemSetProblems(db, input.id);
  const publicProblems = await attachAcceptedStatus(db, {
    currentUserId: input.currentUserId,
    problems,
  });

  return {
    createdAt: toIsoString(item.createdAt),
    descriptionMarkdown: item.descriptionMarkdown,
    id: item.id,
    problems: publicProblems,
    title: item.title,
    updatedAt: toIsoString(item.updatedAt),
  };
};

export const listProblemSetCompletions = async (db: Database, id: string) => {
  await getProblemSetOrThrow(db, id);

  const rows = await db
    .select({
      completedProblemCount: count(luoguAcceptedProblem.pid),
      displayUsername: user.displayUsername,
      name: user.name,
      realName: userProfile.realName,
      userId: user.id,
      username: user.username,
    })
    .from(problemSetProblem)
    .innerJoin(
      luoguAcceptedProblem,
      eq(luoguAcceptedProblem.pid, problemSetProblem.pid)
    )
    .innerJoin(
      userOjAccount,
      and(
        eq(userOjAccount.id, luoguAcceptedProblem.accountId),
        eq(userOjAccount.platform, "luogu")
      )
    )
    .innerJoin(user, eq(user.id, userOjAccount.userId))
    .leftJoin(userProfile, eq(userProfile.userId, user.id))
    .where(
      and(
        eq(problemSetProblem.problemSetId, id),
        inArray(memberStatusExpression, publicActivityMemberStatuses)
      )
    )
    .groupBy(
      user.id,
      user.name,
      user.username,
      user.displayUsername,
      userProfile.realName
    );

  return rows
    .filter((row) => row.completedProblemCount > 0)
    .map((row) => ({
      completedProblemCount: row.completedProblemCount,
      displayName:
        row.realName ??
        row.displayUsername ??
        row.username ??
        row.name ??
        "未命名用户",
      userId: row.userId,
      username: row.username,
    }));
};

export const createProblemSet = async (
  db: Database,
  input: ProblemSetInput
) => {
  const pids = normalizePids(input.pids);
  const item = await db.transaction(async (tx) => {
    const [createdProblemSet] = await tx
      .insert(problemSet)
      .values({
        descriptionMarkdown: input.descriptionMarkdown,
        title: input.title,
      })
      .returning(problemSetFields);

    if (!createdProblemSet) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    }

    await replaceProblemSetProblems(tx, {
      pids,
      problemSetId: createdProblemSet.id,
    });

    return createdProblemSet;
  });

  await enqueueProblemDetailsRefreshes(db, pids);

  return await getProblemSet(db, {
    currentUserId: null,
    id: item.id,
  });
};

export const updateProblemSet = async (
  db: Database,
  input: ProblemSetUpdateInput
) => {
  await getProblemSetOrThrow(db, input.id);
  const pids = input.pids === undefined ? null : normalizePids(input.pids);

  await db.transaction(async (tx) => {
    const values = {
      ...(input.descriptionMarkdown === undefined
        ? {}
        : { descriptionMarkdown: input.descriptionMarkdown }),
      ...(input.title === undefined ? {} : { title: input.title }),
      ...(input.descriptionMarkdown === undefined &&
      input.pids === undefined &&
      input.title === undefined
        ? {}
        : { updatedAt: new Date() }),
    };

    if (Object.keys(values).length > 0) {
      await tx
        .update(problemSet)
        .set(values)
        .where(eq(problemSet.id, input.id));
    }

    if (pids !== null) {
      await replaceProblemSetProblems(tx, {
        pids,
        problemSetId: input.id,
      });
    }
  });

  if (pids !== null) {
    await enqueueProblemDetailsRefreshes(db, pids);
  }

  return await getProblemSet(db, {
    currentUserId: null,
    id: input.id,
  });
};

export const deleteProblemSet = async (db: Database, id: string) => {
  await getProblemSetOrThrow(db, id);
  await db.delete(problemSet).where(eq(problemSet.id, id));

  return { id };
};
