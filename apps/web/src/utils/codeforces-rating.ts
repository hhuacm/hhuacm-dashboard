type CodeforcesRatingTier =
  | "candidate-master"
  | "expert"
  | "grandmaster"
  | "master"
  | "newbie"
  | "pupil"
  | "specialist";

// Rating thresholds are inclusive lower bounds, ordered descending.
const ratingTiers = [
  { minimumRating: 2400, tier: "grandmaster" },
  { minimumRating: 2200, tier: "master" },
  { minimumRating: 1900, tier: "candidate-master" },
  { minimumRating: 1600, tier: "expert" },
  { minimumRating: 1400, tier: "specialist" },
  { minimumRating: 1200, tier: "pupil" },
] as const satisfies readonly {
  minimumRating: number;
  tier: CodeforcesRatingTier;
}[];

const ratingTierClassNames = {
  "candidate-master": "text-[#aa00aa]",
  expert: "text-[#0000ff]",
  grandmaster: "text-[#ff0000]",
  master: "text-[#ff8c00]",
  newbie: "text-[#808080]",
  pupil: "text-[#008000]",
  specialist: "text-[#03a89e]",
} as const satisfies Record<CodeforcesRatingTier, string>;

const getCodeforcesRatingTier = (
  rating: null | number | undefined
): CodeforcesRatingTier => {
  if (rating === null || rating === undefined || !Number.isFinite(rating)) {
    return "newbie";
  }

  return (
    ratingTiers.find(({ minimumRating }) => rating >= minimumRating)?.tier ??
    "newbie"
  );
};

export const getCodeforcesRatingClassName = (
  rating: null | number | undefined
) => ratingTierClassNames[getCodeforcesRatingTier(rating)];
