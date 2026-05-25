import { loadServerEnv } from "../runtime";
import { type SystemUserRole, setUserRoleByUsername } from "../user-role";

const writeLine = (message: string) => {
  process.stdout.write(`${message}\n`);
};

const writeError = (message: string) => {
  process.stderr.write(`${message}\n`);
};

const getArgumentValue = (name: string) => {
  const args = process.argv.slice(2);
  const prefix = `${name}=`;
  const valueWithEquals = args.find((arg) => arg.startsWith(prefix));

  if (valueWithEquals) {
    return valueWithEquals.slice(prefix.length);
  }

  const nameIndex = args.indexOf(name);
  if (nameIndex === -1) {
    return null;
  }

  return args[nameIndex + 1] ?? null;
};

const toSystemUserRole = (value: null | string): SystemUserRole => {
  if (value === "admin" || value === "user") {
    return value;
  }

  throw new Error("Missing or invalid --role. Expected admin or user.");
};

const getRequiredUsername = () => {
  const username = getArgumentValue("--username")?.trim();

  if (!username) {
    throw new Error("Missing required --username.");
  }

  return username;
};

const run = async () => {
  loadServerEnv();

  const role = toSystemUserRole(getArgumentValue("--role"));
  const username = getRequiredUsername();
  const { createDb } = await import("@hhuacm-dashboard/db");
  const result = await setUserRoleByUsername(createDb(), {
    role,
    username,
  });
  const status = result.changed ? "updated" : "unchanged";

  writeLine(
    `${status}: ${result.username} <${result.email}> ${result.oldRole} -> ${result.newRole}`
  );
};

run().catch((error: unknown) => {
  writeError(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
