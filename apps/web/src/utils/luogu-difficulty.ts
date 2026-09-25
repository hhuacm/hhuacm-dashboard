import { getLuoguDifficultyLabel } from "@hhuacm-dashboard/domain";

// Background/foreground colors for each Luogu difficulty, indexed by difficulty value.
const luoguDifficultyClassNames = [
  "bg-[rgb(191,191,191)] text-[#333333]",
  "bg-[rgb(254,76,97)] text-white",
  "bg-[rgb(243,156,17)] text-white",
  "bg-[rgb(255,193,22)] text-[#713f12]",
  "bg-[rgb(83,196,26)] text-white",
  "bg-[rgb(52,152,219)] text-white",
  "bg-[rgb(156,61,207)] text-white",
  "bg-[rgb(14,29,105)] text-white",
] as const;

export function getLuoguDifficultyPresentation(difficulty: number) {
  return {
    className:
      luoguDifficultyClassNames[difficulty] ?? luoguDifficultyClassNames[0],
    label: getLuoguDifficultyLabel(difficulty),
  };
}
