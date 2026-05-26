const problemPidPattern = /^[A-Z0-9][A-Z0-9_-]*$/i;
const problemPidSeparatorPattern = /[,，\s]+/;

export interface ProblemPidParseResult {
  duplicatePids: string[];
  invalidPids: string[];
  pids: string[];
}

const uniqueItems = (items: string[]) => [...new Set(items)];

export const parseProblemPidText = (text: string): ProblemPidParseResult => {
  const pids = text
    .split(problemPidSeparatorPattern)
    .map((pid) => pid.trim())
    .filter(Boolean);
  const seenPids = new Set<string>();
  const duplicatePids: string[] = [];
  const invalidPids: string[] = [];

  for (const pid of pids) {
    if (!problemPidPattern.test(pid)) {
      invalidPids.push(pid);
      continue;
    }

    if (seenPids.has(pid)) {
      duplicatePids.push(pid);
      continue;
    }

    seenPids.add(pid);
  }

  return {
    duplicatePids: uniqueItems(duplicatePids),
    invalidPids: uniqueItems(invalidPids),
    pids,
  };
};
