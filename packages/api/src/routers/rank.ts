import { publicProcedure, router } from "../index";
import { listCodeforcesRankRows } from "../services/rank/codeforces";

export const rankRouter = router({
  codeforces: router({
    list: publicProcedure.query(
      async ({ ctx }) => await listCodeforcesRankRows(ctx.db)
    ),
  }),
});
