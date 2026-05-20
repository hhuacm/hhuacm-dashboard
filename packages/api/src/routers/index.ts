import { router } from "../index";
import { accountRouter } from "./account";
import { adminRouter } from "./admin";
import { dashboardRouter } from "./dashboard";
import { healthProcedure } from "./health";
import { problemSetRouter } from "./problem-set";
import { profileRouter } from "./profile";
import { rankRouter } from "./rank";
import { settingsRouter } from "./settings";

export const appRouter = router({
  account: accountRouter,
  admin: adminRouter,
  dashboard: dashboardRouter,
  health: healthProcedure,
  problemSet: problemSetRouter,
  profile: profileRouter,
  rank: rankRouter,
  settings: settingsRouter,
});

export type AppRouter = typeof appRouter;
