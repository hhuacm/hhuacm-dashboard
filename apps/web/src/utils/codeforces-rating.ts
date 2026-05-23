type CodeforcesRatingTier =
  | "candidate-master"
  | "expert"
  | "grandmaster"
  | "master"
  | "newbie"
  | "pupil"
  | "specialist";

const getCodeforcesRatingTier = (
  rating: null | number | undefined
): CodeforcesRatingTier => {
  if (rating === null || rating === undefined) {
    return "newbie";
  }

  if (!Number.isFinite(rating)) {
    return "newbie";
  }

  if (rating < 1200) {
    return "newbie";
  }

  if (rating < 1400) {
    return "pupil";
  }

  if (rating < 1600) {
    return "specialist";
  }

  if (rating < 1900) {
    return "expert";
  }

  if (rating < 2200) {
    return "candidate-master";
  }

  if (rating < 2400) {
    return "master";
  }

  return "grandmaster";
};

export const getCodeforcesRatingClassName = (
  rating: null | number | undefined
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
