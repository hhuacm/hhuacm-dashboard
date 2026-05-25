import { readFile } from "node:fs/promises";
import path from "node:path";
import { importUsersFromSystemSeedFile } from "../import-users";
import { loadServerEnv } from "../runtime";

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

const getRequiredFilePath = () => {
  const filePath = getArgumentValue("--file")?.trim();

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

  writeLine(
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
  writeError(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
