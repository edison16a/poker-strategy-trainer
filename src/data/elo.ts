import raw from "./elo.json";

export type DecisionTier = { minScore: number; base: number };

export type RunoutOutcome = "win" | "chop" | "lose";

export type AttemptValues = { firstAttempt: number; laterAttempt: number };

/**
 * Elo rules.
 *
 * `decisionTiers` is checked top to bottom; the first tier whose `minScore`
 * the coach score reaches wins. Positive bases are randomised by
 * `randomGain`, negative ones are applied as-is (then scaled by the rank
 * penalty factor in the caller). The tiers must stay sorted descending.
 *
 * `runout` is the flat Elo applied after a playthrough showdown, keyed by
 * whether the hero stayed in and how the hand would have ended.
 *
 * `outsQuiz.bonusByDiff[d]` is the reward for guessing `d` outs away from the
 * true count; anything beyond the table is a miss.
 */
export const ELO_RULES = raw as {
  randomGain: { spreadRatio: number; minSpread: number; minGain: number };
  decisionTiers: DecisionTier[];
  runout: { stayedIn: Record<RunoutOutcome, number>; folded: Record<RunoutOutcome, number> };
  outsQuiz: { maxAttempts: number; bonusByDiff: AttemptValues[]; missPenalty: AttemptValues };
};
