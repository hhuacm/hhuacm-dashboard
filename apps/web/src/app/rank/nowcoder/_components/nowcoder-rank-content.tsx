"use client";

import { useQuery } from "@tanstack/react-query";

import { useTRPC } from "@/utils/trpc";
import { RankBoard } from "../../_components/rank-shared";
import { nowcoderRankConfig } from "../helpers";
import { NowcoderRankTable } from "./nowcoder-rank-table";

export function NowcoderRankContent() {
  const trpc = useTRPC();
  const rankQuery = useQuery(trpc.rank.nowcoder.list.queryOptions());

  return (
    <RankBoard
      config={{
        ...nowcoderRankConfig,
        renderTable: (tableProps) => <NowcoderRankTable {...tableProps} />,
      }}
      query={rankQuery}
    />
  );
}
