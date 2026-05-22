import { Chip } from "@heroui/react";
import { CheckCircle2, CircleMinus, CircleX } from "lucide-react";
import type { ReactNode } from "react";

import {
  getDifficultyLabel,
  luoguDifficultyClassNames,
  type ProblemSetProblem,
} from "../_model/problem-set-detail-view";

export function ProblemStatusChip({
  accepted,
}: {
  accepted: ProblemSetProblem["accepted"];
}) {
  if (accepted === true) {
    return (
      <Chip
        className="bg-success-soft px-3 py-1 text-sm text-success"
        size="md"
        variant="soft"
      >
        <CheckCircle2 className="size-4" />
        已通过
      </Chip>
    );
  }

  if (accepted === false) {
    return (
      <Chip
        className="bg-default px-3 py-1 text-muted text-sm"
        size="md"
        variant="soft"
      >
        <CircleX className="size-4" />
        未通过
      </Chip>
    );
  }

  return (
    <Chip
      className="bg-default px-3 py-1 text-muted text-sm"
      size="md"
      variant="soft"
    >
      <CircleMinus className="size-4" />
      未判定
    </Chip>
  );
}

export function CenteredTableChip({ children }: { children: ReactNode }) {
  return <div className="flex justify-center">{children}</div>;
}

export function DifficultyChip({ difficulty }: { difficulty: null | number }) {
  if (difficulty === null) {
    return <span className="text-muted">-</span>;
  }

  const className =
    luoguDifficultyClassNames[difficulty] ?? luoguDifficultyClassNames[0];
  const label = getDifficultyLabel(difficulty);

  return (
    <Chip className={`${className} font-semibold`} size="md" variant="soft">
      {label}
    </Chip>
  );
}
