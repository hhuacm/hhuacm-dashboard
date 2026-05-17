import { publicProcedure, router } from "../index";
import { getDashboardSummary } from "../services/dashboard";

export const dashboardRouter = router({
  summary: publicProcedure.query(
    async ({ ctx }) => await getDashboardSummary(ctx.db)
  ),
});
