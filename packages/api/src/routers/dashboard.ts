import { publicProcedure, router } from "../index";
import { getDashboardSummary } from "../services/dashboard";
import { getHomeNoticeMarkdown } from "../services/site-setting";

export const dashboardRouter = router({
  homeNotice: publicProcedure.query(async ({ ctx }) => ({
    markdown: await getHomeNoticeMarkdown(ctx.db),
  })),
  summary: publicProcedure.query(
    async ({ ctx }) => await getDashboardSummary(ctx.db)
  ),
});
