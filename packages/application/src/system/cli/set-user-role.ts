import { parseArgs } from "node:util";
import { loadServerEnv } from "../runtime";
import { type SystemUserRole, setUserRoleByUsername } from "../user-role";

const toSystemUserRole = (value: string | undefined): SystemUserRole => {
  if (value === "admin" || value === "user") {
    return value;
  }

  throw new Error("Missing or invalid --role. Expected admin or user.");
};

const getRequiredUsername = (value: string | undefined) => {
  const username = value?.trim();

  if (!username) {
    throw new Error("Missing required --username.");
  }

  return username;
};

const run = async () => {
  loadServerEnv();

  const { role: roleValue, username: usernameValue } = parseArgs({
    options: {
      role: { type: "string" },
      username: { type: "string" },
    },
  }).values;
  const role = toSystemUserRole(roleValue);
  const username = getRequiredUsername(usernameValue);
  const { createDb } = await import("@hhuacm-dashboard/db");
  const result = await setUserRoleByUsername(createDb(), {
    role,
    username,
  });
  const status = result.changed ? "updated" : "unchanged";

  console.log(
    `${status}: ${result.username} <${result.email}> ${result.oldRole} -> ${result.newRole}`
  );
};

run().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
