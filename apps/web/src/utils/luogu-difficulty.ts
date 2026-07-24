const luoguDifficultyPresentations = [
  {
    className: "bg-[rgb(191,191,191)] text-[#333333]",
    label: "暂无评定",
  },
  {
    className: "bg-[rgb(254,76,97)] text-white",
    label: "入门",
  },
  {
    className: "bg-[rgb(243,156,17)] text-white",
    label: "普及-",
  },
  {
    className: "bg-[rgb(255,193,22)] text-[#713f12]",
    label: "普及/提高-",
  },
  {
    className: "bg-[rgb(83,196,26)] text-white",
    label: "普及+/提高",
  },
  {
    className: "bg-[rgb(52,152,219)] text-white",
    label: "提高+/省选-",
  },
  {
    className: "bg-[rgb(156,61,207)] text-white",
    label: "省选/NOI-",
  },
  {
    className: "bg-[rgb(14,29,105)] text-white",
    label: "NOI/NOI+/CTSC",
  },
] as const;

export function getLuoguDifficultyLabel(difficulty: null | number) {
  if (difficulty === null) {
    return "-";
  }

  return (
    luoguDifficultyPresentations[difficulty]?.label ?? `难度 ${difficulty}`
  );
}

export function getLuoguDifficultyPresentation(difficulty: number) {
  return (
    luoguDifficultyPresentations[difficulty] ?? {
      className: luoguDifficultyPresentations[0].className,
      label: getLuoguDifficultyLabel(difficulty),
    }
  );
}
