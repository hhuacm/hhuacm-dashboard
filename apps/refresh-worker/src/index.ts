import { runRefreshRuntime } from "@hhuacm-dashboard/application/refresh/runtime";
import { getDb } from "@hhuacm-dashboard/db";

console.log("Started refresh worker");
await runRefreshRuntime(getDb());
