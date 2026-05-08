import { arch, platform, release } from "node:os";

import { user } from "@hhuacm-dashboard/db/schema/auth";
import { userProfile } from "@hhuacm-dashboard/db/schema/profile";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
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
});
export type AppRouter = typeof appRouter;
