import { getDashboardSummary } from "@hhuacm-dashboard/application/services/dashboard";
import { getHomeNoticeMarkdown } from "@hhuacm-dashboard/application/services/site-setting";
import { publicProcedure, router } from "../index";

export const dashboardRouter = router({
  homeNotice: publicProcedure.query(async ({ ctx }) => ({
    markdown: await getHomeNoticeMarkdown(ctx.db),
  })),
  summary: publicProcedure.query(
    async ({ ctx }) => await getDashboardSummary(ctx.db)
  ),
});
