export type CodeforcesRatingTier =
  | "candidate-master"
  | "expert"
  | "grandmaster"
  | "master"
  | "newbie"
  | "pupil"
  | "specialist";

export const getCodeforcesRatingTier = (
  rating: null | number | string | undefined
): CodeforcesRatingTier => {
  if (rating === null || rating === undefined || rating === "—") {
    return "newbie";
  }

  const parsedRating =
    typeof rating === "string" ? Number.parseInt(rating, 10) : rating;

  if (!Number.isFinite(parsedRating)) {
    return "newbie";
  }

  if (parsedRating < 1200) {
    return "newbie";
  }

  if (parsedRating < 1400) {
    return "pupil";
  }

  if (parsedRating < 1600) {
    return "specialist";
  }

  if (parsedRating < 1900) {
    return "expert";
  }

  if (parsedRating < 2200) {
    return "candidate-master";
  }

  if (parsedRating < 2400) {
    return "master";
  }

  return "grandmaster";
};

export const getCodeforcesRatingClassName = (
  rating: null | number | string | undefined
) => {
  const tier = getCodeforcesRatingTier(rating);

  if (tier === "pupil") {
    return "text-[#008000]";
  }

  if (tier === "specialist") {
    return "text-[#03a89e]";
  }

  if (tier === "expert") {
    return "text-[#0000ff]";
  }

  if (tier === "candidate-master") {
    return "text-[#aa00aa]";
  }

  if (tier === "master") {
    return "text-[#ff8c00]";
  }

  if (tier === "grandmaster") {
    return "text-[#ff0000]";
  }

  return "text-[#808080]";
};
