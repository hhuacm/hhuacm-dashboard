import type { Context } from "../../context";

export type Database = Context["db"];

export type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

export interface ProblemSetInput {
  descriptionMarkdown: string;
  pids: string[];
  title: string;
}

export interface ProblemSetUpdateInput {
  descriptionMarkdown?: string;
  id: string;
  pids?: string[];
  title?: string;
}
