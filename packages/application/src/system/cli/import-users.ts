import { readFile } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";
import { importUsersFromSystemSeedFile } from "../import-users";
import { loadServerEnv } from "../runtime";

const getRequiredFilePath = () => {
  const filePath = parseArgs({
    options: { file: { type: "string" } },
  }).values.file?.trim();

  if (!filePath) {
    throw new Error("Missing required --file.");
  }

  return path.resolve(process.cwd(), filePath);
};

const readJsonFile = async (filePath: string) => {
  const content = await readFile(filePath, "utf8");

  try {
    return JSON.parse(content) as unknown;
  } catch {
    throw new Error(`Invalid JSON file: ${filePath}`);
  }
};

const run = async () => {
  loadServerEnv();

  const filePath = getRequiredFilePath();
  const input = await readJsonFile(filePath);
  const { createDb } = await import("@hhuacm-dashboard/db");
  const result = await importUsersFromSystemSeedFile(createDb(), input);

  console.log(
    [
      `imported users: ${result.userCount}`,
      `admins: ${result.adminCount}`,
      `profiles: ${result.profileCount}`,
      `oj accounts: ${result.ojAccountCount}`,
      `refresh requests: ${result.refreshRequestCount}`,
    ].join(", ")
  );
};

run().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
