export type ObjectiveStep = "scout" | "discover-more" | "choose-site" | "under-construction" | "complete";

export interface ObjectiveStatus {
  step: ObjectiveStep;
  title: string;
  description: string;
}

const DISCOVERIES_TO_SCOUT = 3;

/**
 * Pure and derived, not a separate tracked state field: the objective is
 * always a function of discoveries/construction that already exist in the
 * store, so there's nothing to fall out of sync. Doubles as the "first
 * session guidance" the brief asks for — a contextual prompt that updates
 * itself as the player progresses, rather than a separate tutorial overlay.
 */
export function computeObjectiveStatus(params: {
  discoveriesCompleted: number;
  constructionSites: readonly { completed: boolean }[];
}): ObjectiveStatus {
  const { discoveriesCompleted, constructionSites } = params;
  const hasSite = constructionSites.length > 0;
  const hasCompletedSite = constructionSites.some((s) => s.completed);

  if (hasCompletedSite) {
    return {
      step: "complete",
      title: "First expansion underway",
      description: "The civilization's first expansion project is complete. Keep exploring, or open Construction to expand further.",
    };
  }
  if (hasSite) {
    return {
      step: "under-construction",
      title: "Construction in progress",
      description: "Use “End Expedition Phase” to advance time and progress the build.",
    };
  }
  if (discoveriesCompleted >= DISCOVERIES_TO_SCOUT) {
    return {
      step: "choose-site",
      title: "Choose an expansion site",
      description: "You've scouted enough of the region — open Construction and choose a site for the first expansion project.",
    };
  }
  if (discoveriesCompleted >= 1) {
    return {
      step: "discover-more",
      title: "Keep scouting",
      description: `Discovered ${discoveriesCompleted} of ${DISCOVERIES_TO_SCOUT} notable sites. Keep exploring to reveal more of the region.`,
    };
  }
  return {
    step: "scout",
    title: "Scout the region",
    description: "Select the explorer and move into unexplored territory — see what this land has to offer.",
  };
}
