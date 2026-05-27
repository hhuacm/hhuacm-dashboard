import { listCodeforcesRankRows } from "@hhuacm-dashboard/application/services/rank/codeforces";
import { listLuoguRankRows } from "@hhuacm-dashboard/application/services/rank/luogu";
import { publicProcedure, router } from "../index";

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
