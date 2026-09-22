import raw from "./scenario.json";
import type { OpponentName, Street } from "@/domain/types";

export type StreetTable<T> = Record<Street, T>;

/**
 * Tuning for spot generation and the scripted opponents.
 *
 * `opponentHeuristic` drives the single-decision generator: a draw below
 * `bluffChance` or `betChance` produces a bet (the two thresholds are kept
 * separate because the original design distinguished bluffs, even though
 * both currently produce the same action).
 *
 * `playthrough` drives the opponents on later streets: the strongest
 * opponent bets with probability `betBias + strength * strengthBetWeight`,
 * the others call when their made-hand category reaches `callStrengthMin`
 * (two pair) unless a `callSkipChance` roll skips them, and so on. Timings
 * are the delays of the reveal animation.
 */
export const SCENARIO = raw as {
  effectiveStackBb: number;
  opponentNames: OpponentName[];
  facingBetChance: number;
  opponentHeuristic: StreetTable<{ bluffChance: number; betChance: number }>;
  betSizeMultipliers: StreetTable<number[]>;
  minBetBb: number;
  playthrough: {
    betBias: StreetTable<number>;
    strengthBetWeight: number;
    sizeMultipliers: StreetTable<number[]>;
    callStrengthMin: number;
    callSkipChance: number;
    foldChance: number;
    revealStepMs: number;
    revealTailMs: number;
    runoutEloDelayMs: number;
  };
};
