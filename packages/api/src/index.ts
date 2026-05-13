import { user } from "@hhuacm-dashboard/db/schema/auth";
import { initTRPC, TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";

import type { Context } from "./context";

export const t = initTRPC.context<Context>().create();

export const router = t.router;

export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
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
