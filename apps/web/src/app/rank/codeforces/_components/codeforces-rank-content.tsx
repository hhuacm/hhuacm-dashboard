"use client";

import { useQuery } from "@tanstack/react-query";

import { trpc } from "@/utils/trpc";
import { RankBoard } from "../../_components/rank-shared";
import { codeforcesRankConfig } from "../helpers";
import { CodeforcesRankTable } from "./codeforces-rank-table";

export function CodeforcesRankContent() {
  const rankQuery = useQuery(trpc.rank.codeforces.list.queryOptions());

  return (
    <RankBoard
      config={{
        ...codeforcesRankConfig,
        renderTable: (tableProps) => <CodeforcesRankTable {...tableProps} />,
      }}
      query={rankQuery}
    />
  );
}
