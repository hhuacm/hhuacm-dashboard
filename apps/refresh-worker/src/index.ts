import { startRefreshRuntime } from "@hhuacm-dashboard/application/refresh/runtime";
import { db } from "@hhuacm-dashboard/db";

const runtimeStore = globalThis as typeof globalThis & {
  __hhuacmRefreshRuntime?: ReturnType<typeof startRefreshRuntime>;
};

runtimeStore.__hhuacmRefreshRuntime?.stop();
runtimeStore.__hhuacmRefreshRuntime = startRefreshRuntime({ db });

console.log("Started refresh worker");
