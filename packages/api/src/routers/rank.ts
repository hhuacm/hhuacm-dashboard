import { listAtcoderRankRows } from "@hhuacm-dashboard/application/services/rank/atcoder";
import { listCodeforcesRankRows } from "@hhuacm-dashboard/application/services/rank/codeforces";
import { listLuoguRankRows } from "@hhuacm-dashboard/application/services/rank/luogu";
import { listNowcoderRankRows } from "@hhuacm-dashboard/application/services/rank/nowcoder";
import { publicProcedure, router } from "../index";

export const rankRouter = router({
  atcoder: router({
    list: publicProcedure.query(
      async ({ ctx }) => await listAtcoderRankRows(ctx.db)
    ),
  }),
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
  nowcoder: router({
    list: publicProcedure.query(
      async ({ ctx }) => await listNowcoderRankRows(ctx.db)
    ),
  }),
});
