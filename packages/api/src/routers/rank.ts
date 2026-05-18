import { publicProcedure, router } from "../index";
import { listCodeforcesRankRows } from "../services/rank/codeforces";
import { listLuoguRankRows } from "../services/rank/luogu";

export const rankRouter = router({
  codeforces: router({
    list: publicProcedure.query(
      async ({ ctx }) => await listCodeforcesRankRows(ctx.db)
    ),
  }),
  luogu: router({
    list: publicProcedure.query(
      async ({ ctx }) => await listLuoguRankRows(ctx.db)
    ),
  }),
});
