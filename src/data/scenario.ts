import raw from "./scenario.json";
import type { OpponentName, Street } from "@/domain/types";

export type StreetTable<T> = Record<Street, T>;

/**
 * Tuning for spot generation and the scripted opponents.
 *
 * `facingBetChance` is how often a fresh spot has a bet to face; the
 * aggressor is picked uniformly and sizes its bet from
 * `betSizeMultipliers` for the street.
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
