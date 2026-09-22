import { type Rng, defaultRng } from "./random";
import { ELO_RULES, type RunoutOutcome } from "@/data/elo";

/**
 * A positive Elo reward jittered by plus or minus a fraction of itself so
 * repeated identical scores do not produce identical gains. Never below 1.
 */
export function randomGain(base: number, rng: Rng = defaultRng): number {
  const { spreadRatio, minSpread, minGain } = ELO_RULES.randomGain;
  const spread = Math.max(minSpread, Math.round(base * spreadRatio));
  const min = Math.max(minGain, base - spread);
  const max = base + spread;
  return Math.floor(rng() * (max - min + 1)) + min;
}

/** Base Elo delta for a coach score, before the rank penalty factor. */
export function eloDeltaFromScore(score: number, rng: Rng = defaultRng): number {
  const tier = ELO_RULES.decisionTiers.find(t => score >= t.minScore) ?? ELO_RULES.decisionTiers[ELO_RULES.decisionTiers.length - 1];
  const base = tier.base;
  return base > 0 ? randomGain(base, rng) : base;
}

/** Elo is a non-negative integer. */
export function clampElo(x: number): number {
  return Math.max(0, Math.round(x));
}

/**
 * Scales a loss by the rank's penalty factor and leaves gains untouched.
 * Low ranks lose less so beginners are not bounced back to zero.
 */
export function applyPenaltyFactor(delta: number, penaltyFactor: number): number {
  return delta < 0 ? Math.round(delta * penaltyFactor) : delta;
}

/**
 * Flat Elo for how a playthrough ended. Folding is rewarded when it dodged a
 * loss and punished when the hero was winning, so the table is keyed by
 * whether the hero stayed in and by the would-be result.
 */
export function runoutEloDelta(heroFolded: boolean, heroWouldResult: RunoutOutcome): number {
  return heroFolded ? ELO_RULES.runout.folded[heroWouldResult] : ELO_RULES.runout.stayedIn[heroWouldResult];
}

/**
 * Elo for an outs guess. Closer guesses and first attempts earn more;
 * a guess further off than the table covers is a miss, and a second miss
 * costs double. Rewards are jittered, penalties scaled by rank.
 */
export function outsQuizBonus(
  answer: number,
  correct: number,
  attempt: number,
  penaltyFactor: number,
  rng: Rng = defaultRng,
): number {
  const { bonusByDiff, missPenalty } = ELO_RULES.outsQuiz;
  const diff = Math.abs(answer - correct);
  const row = bonusByDiff[diff];
  const first = attempt === 1;
  const baseBonus = row
    ? (first ? row.firstAttempt : row.laterAttempt)
    : (attempt >= 2 ? missPenalty.laterAttempt : missPenalty.firstAttempt);
  return baseBonus > 0 ? randomGain(baseBonus, rng) : applyPenaltyFactor(baseBonus, penaltyFactor);
}
