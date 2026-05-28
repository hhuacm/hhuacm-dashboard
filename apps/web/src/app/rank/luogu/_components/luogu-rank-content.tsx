"use client";

import { useQuery } from "@tanstack/react-query";

import { trpc } from "@/utils/trpc";
import { RankBoard } from "../../_components/rank-shared";
import { luoguRankConfig } from "../helpers";
import { LuoguRankTable } from "./luogu-rank-table";

export function LuoguRankContent() {
  const rankQuery = useQuery(trpc.rank.luogu.list.queryOptions());

  return (
    <RankBoard
      config={{
        ...luoguRankConfig,
        renderTable: (tableProps) => <LuoguRankTable {...tableProps} />,
      }}
      query={rankQuery}
    />
  );
}
