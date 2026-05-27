import { isApplicationError } from "@hhuacm-dashboard/application/errors";
import { user } from "@hhuacm-dashboard/db/schema/auth";
import { initTRPC, TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";

import type { Context } from "./context";

export const t = initTRPC.context<Context>().create();

export const router = t.router;

const applicationErrorMiddleware = t.middleware(async ({ next }) => {
  const result = await next();

  if (result.ok || !isApplicationError(result.error.cause)) {
    return result;
  }

  throw new TRPCError({
    code: result.error.cause.code,
    message: result.error.cause.message,
  });
});

export const publicProcedure = t.procedure.use(applicationErrorMiddleware);

export const protectedProcedure = publicProcedure.use(({ ctx, next }) => {
  const currentSession = ctx.session;

  if (!currentSession) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  return next({
    ctx: {
      ...ctx,
      session: currentSession,
    },
  });
});

export const adminProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  const [currentUser] = await ctx.db
    .select({ role: user.role })
    .from(user)
    .where(eq(user.id, ctx.session.user.id))
    .limit(1);

  if (currentUser?.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN" });
  }

  return next({
    ctx: {
      ...ctx,
      userRole: currentUser.role,
    },
  });
});
