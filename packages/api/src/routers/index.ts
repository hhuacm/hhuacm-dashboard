import { arch, platform, release } from "node:os";

import { user } from "@hhuacm-dashboard/db/schema/auth";
import {
  ojPlatforms,
  userOjAccount,
} from "@hhuacm-dashboard/db/schema/oj-account";
import { userProfile } from "@hhuacm-dashboard/db/schema/profile";
import { TRPCError } from "@trpc/server";
import { and, asc, eq, ne } from "drizzle-orm";
import { z } from "zod";

import { protectedProcedure, publicProcedure, router } from "../index";

const serverStartedAt = new Date();

const profileFields = {
  grade: userProfile.grade,
  major: userProfile.major,
  realName: userProfile.realName,
  studentId: userProfile.studentId,
} as const;

const profileInputSchema = z.object({
  grade: z.string(),
  major: z.string(),
  realName: z.string(),
  studentId: z.string(),
});

const ojAccountFields = {
  handle: userOjAccount.handle,
  platform: userOjAccount.platform,
} as const;

const ojPlatformSchema = z.enum(ojPlatforms);

const trimmedStringSchema = z.string().trim().min(1);

const ojAccountInputSchema = z.object({
  handle: trimmedStringSchema,
  platform: ojPlatformSchema,
});

const ojAccountPlatformInputSchema = z.object({
  platform: ojPlatformSchema,
});

const ojAccountListInputSchema = z.object({
  username: trimmedStringSchema,
});

const normalizeHandle = (handle: string) => handle.toLowerCase();

const getExistingCurrentUserAccountMessage = (account: {
  handle: string;
  platform: string;
}) => `OJ account already exists: ${account.platform} ${account.handle}`;

const getBunRuntime = () => {
  const candidate: unknown = Reflect.get(globalThis, "Bun");

  if (typeof candidate !== "object" || candidate === null) {
    return null;
  }

  const version: unknown = Reflect.get(candidate, "version");

  if (typeof version !== "string") {
    return null;
  }

  return { version };
};

const getRuntimeName = () => {
  if (getBunRuntime()) {
    return "Bun";
  }

  return "Node.js";
};

const getRuntimeVersion = () => {
  const bunRuntime = getBunRuntime();

  if (bunRuntime) {
    return bunRuntime.version;
  }

  return process.version;
};

export const appRouter = router({
  health: publicProcedure.query(() => {
    const checkedAt = new Date();

    return {
      status: "ok",
      service: "hhuacm-dashboard API",
      checkedAt: checkedAt.toISOString(),
      uptimeMs: checkedAt.getTime() - serverStartedAt.getTime(),
      environment: process.env.NODE_ENV ?? "development",
      runtime: {
        name: getRuntimeName(),
        version: getRuntimeVersion(),
      },
      system: {
        platform: platform(),
        arch: arch(),
        release: release(),
      },
    };
  }),
  profile: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      const [profile] = await ctx.db
        .select({
          ...profileFields,
          userId: user.id,
        })
        .from(user)
        .leftJoin(userProfile, eq(userProfile.userId, user.id))
        .where(eq(user.id, ctx.session.user.id))
        .limit(1);

      if (!profile) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      return {
        grade: profile.grade,
        major: profile.major,
        realName: profile.realName,
        studentId: profile.studentId,
      };
    }),
    update: protectedProcedure
      .input(profileInputSchema)
      .mutation(async ({ ctx, input }) => {
        const [currentUser] = await ctx.db
          .select({ id: user.id })
          .from(user)
          .where(eq(user.id, ctx.session.user.id))
          .limit(1);

        if (!currentUser) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }

        const [profile] = await ctx.db
          .insert(userProfile)
          .values({
            ...input,
            userId: ctx.session.user.id,
          })
          .onConflictDoUpdate({
            set: {
              ...input,
              updatedAt: new Date(),
            },
            target: userProfile.userId,
          })
          .returning(profileFields);

        if (!profile) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }

        return profile;
      }),
  }),
  ojAccount: router({
    add: protectedProcedure
      .input(ojAccountInputSchema)
      .mutation(async ({ ctx, input }) => {
        const [existingCurrentUserAccount] = await ctx.db
          .select(ojAccountFields)
          .from(userOjAccount)
          .where(
            and(
              eq(userOjAccount.userId, ctx.session.user.id),
              eq(userOjAccount.platform, input.platform)
            )
          )
          .limit(1);

        if (existingCurrentUserAccount) {
          throw new TRPCError({
            code: "CONFLICT",
            message: getExistingCurrentUserAccountMessage(
              existingCurrentUserAccount
            ),
          });
        }

        const normalizedHandle = normalizeHandle(input.handle);
        const [existingHandleOwner] = await ctx.db
          .select(ojAccountFields)
          .from(userOjAccount)
          .where(
            and(
              eq(userOjAccount.platform, input.platform),
              eq(userOjAccount.normalizedHandle, normalizedHandle)
            )
          )
          .limit(1);

        if (existingHandleOwner) {
          throw new TRPCError({
            code: "CONFLICT",
            message: `OJ handle already exists: ${existingHandleOwner.platform} ${existingHandleOwner.handle}`,
          });
        }

        const [account] = await ctx.db
          .insert(userOjAccount)
          .values({
            handle: input.handle,
            normalizedHandle,
            platform: input.platform,
            userId: ctx.session.user.id,
          })
          .returning(ojAccountFields);

        if (!account) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        }

        return account;
      }),
    update: protectedProcedure
      .input(ojAccountInputSchema)
      .mutation(async ({ ctx, input }) => {
        const [existingCurrentUserAccount] = await ctx.db
          .select(ojAccountFields)
          .from(userOjAccount)
          .where(
            and(
              eq(userOjAccount.userId, ctx.session.user.id),
              eq(userOjAccount.platform, input.platform)
            )
          )
          .limit(1);

        if (!existingCurrentUserAccount) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: `OJ account does not exist: ${input.platform}`,
          });
        }

        const normalizedHandle = normalizeHandle(input.handle);
        const [existingHandleOwner] = await ctx.db
          .select(ojAccountFields)
          .from(userOjAccount)
          .where(
            and(
              eq(userOjAccount.platform, input.platform),
              eq(userOjAccount.normalizedHandle, normalizedHandle),
              ne(userOjAccount.userId, ctx.session.user.id)
            )
          )
          .limit(1);

        if (existingHandleOwner) {
          throw new TRPCError({
            code: "CONFLICT",
            message: `OJ handle already exists: ${existingHandleOwner.platform} ${existingHandleOwner.handle}`,
          });
        }

        const [account] = await ctx.db
          .update(userOjAccount)
          .set({
            handle: input.handle,
            normalizedHandle,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(userOjAccount.userId, ctx.session.user.id),
              eq(userOjAccount.platform, input.platform)
            )
          )
          .returning(ojAccountFields);

        if (!account) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }

        return account;
      }),
    delete: protectedProcedure
      .input(ojAccountPlatformInputSchema)
      .mutation(async ({ ctx, input }) => {
        const [account] = await ctx.db
          .delete(userOjAccount)
          .where(
            and(
              eq(userOjAccount.userId, ctx.session.user.id),
              eq(userOjAccount.platform, input.platform)
            )
          )
          .returning(ojAccountFields);

        if (!account) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: `OJ account does not exist: ${input.platform}`,
          });
        }

        return account;
      }),
    listByUsername: publicProcedure
      .input(ojAccountListInputSchema)
      .query(async ({ ctx, input }) => {
        const [targetUser] = await ctx.db
          .select({ id: user.id, username: user.username })
          .from(user)
          .where(eq(user.username, input.username))
          .limit(1);

        if (!targetUser?.username) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: `User does not exist: ${input.username}`,
          });
        }

        const accounts = await ctx.db
          .select(ojAccountFields)
          .from(userOjAccount)
          .where(eq(userOjAccount.userId, targetUser.id))
          .orderBy(asc(userOjAccount.platform));

        return {
          accounts,
          username: targetUser.username,
        };
      }),
  }),
});
export type AppRouter = typeof appRouter;
