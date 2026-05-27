import { getCurrentUser } from "@hhuacm-dashboard/application/services/account";
import { protectedProcedure, router } from "../index";

export const accountRouter = router({
  me: protectedProcedure.query(
    async ({ ctx }) => await getCurrentUser(ctx.db, ctx.session.user.id)
  ),
});
