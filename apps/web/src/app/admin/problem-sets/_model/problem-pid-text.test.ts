import { describe, expect, it } from "bun:test";

import { parseProblemPidText } from "./problem-pid-text";

describe("parseProblemPidText", () => {
  it("parses comma separated Luogu PIDs", () => {
    expect(parseProblemPidText("P1001, P1002, P1003")).toEqual({
      duplicatePids: [],
      invalidPids: [],
      pids: ["P1001", "P1002", "P1003"],
    });
  });

  it("supports Chinese commas, line breaks, and repeated whitespace", () => {
    expect(parseProblemPidText("P1001，P1002\nP1003   P1004")).toEqual({
      duplicatePids: [],
      invalidPids: [],
      pids: ["P1001", "P1002", "P1003", "P1004"],
    });
  });

  it("returns an empty result for blank input", () => {
    expect(parseProblemPidText(" \n\t ， ,, ")).toEqual({
      duplicatePids: [],
      invalidPids: [],
      pids: [],
    });
  });

  it("marks invalid PIDs", () => {
    expect(parseProblemPidText("P1001 https://example.com P-1002")).toEqual({
      duplicatePids: [],
      invalidPids: ["https://example.com"],
      pids: ["P1001", "https://example.com", "P-1002"],
    });
  });

  it("marks duplicate PIDs without changing case", () => {
    expect(parseProblemPidText("P1001 P1002 P1001 p1001")).toEqual({
      duplicatePids: ["P1001"],
      invalidPids: [],
      pids: ["P1001", "P1002", "P1001", "p1001"],
    });
  });
});
