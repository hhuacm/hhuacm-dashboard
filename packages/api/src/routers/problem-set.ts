import { publicProcedure, router } from "../index";
import {
  getProblemSet,
  listProblemSetCompletions,
  listProblemSets,
} from "../services/problem-set/read-model";
import { problemSetIdInputSchema } from "./schemas";

export const problemSetRouter = router({
  completions: publicProcedure
    .input(problemSetIdInputSchema)
    .query(
      async ({ ctx, input }) =>
        await listProblemSetCompletions(ctx.db, input.id)
    ),
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
