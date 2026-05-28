"use client";

import { useQuery } from "@tanstack/react-query";

import { trpc } from "@/utils/trpc";
import { RankBoard } from "../../_components/rank-shared";
import { atcoderRankConfig } from "../helpers";
import { AtcoderRankTable } from "./atcoder-rank-table";

export function AtcoderRankContent() {
  const rankQuery = useQuery(trpc.rank.atcoder.list.queryOptions());

  return (
    <RankBoard
      config={{
        ...atcoderRankConfig,
        renderTable: (tableProps) => <AtcoderRankTable {...tableProps} />,
      }}
      query={rankQuery}
    />
  );
}
