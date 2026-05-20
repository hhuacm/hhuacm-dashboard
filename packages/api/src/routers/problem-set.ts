import { publicProcedure, router } from "../index";
import { getProblemSet, listProblemSets } from "../services/problem-set";
import { problemSetIdInputSchema } from "./schemas";

export const problemSetRouter = router({
  get: publicProcedure.input(problemSetIdInputSchema).query(
    async ({ ctx, input }) =>
      await getProblemSet(ctx.db, {
        currentUserId: ctx.session?.user.id ?? null,
        id: input.id,
      })
  ),
  list: publicProcedure.query(
    async ({ ctx }) =>
      await listProblemSets(ctx.db, {
        currentUserId: ctx.session?.user.id ?? null,
      })
  ),
});
