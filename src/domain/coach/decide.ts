import type { CoachAction, TrainingState } from "../types";
import type { PreflopProfile } from "./preflop";
import { COACH } from "@/data/coach";

const D = COACH.tuning.decision;
const P = COACH.tuning.preflopDecision;

export type BestLine = { bestAction: CoachAction; bestRaiseSizeBb: number | null };

/**
 * The line the coach recommends.
 *
 * Postflop it is a pot-odds decision: raise with a clear edge, call with a
 * small negative edge, fold otherwise; with no bet to face, open when the
 * hand plus position clears the threshold or when the table checked to us.
 * Preflop the starting-hand strength overrides all of that, because a
 * made-hand equity estimate means little before the flop.
 */
export function decideBestLine(
  state: TrainingState,
  equity: number,
  edge: number,
  posAggression: number,
  preflopProfile: PreflopProfile | null,
): BestLine {
  const allChecked = state.opponentActions.every(a => a.action === "CHECK");
  const allFolded = state.opponentActions.every(a => a.action === "FOLD");

  let bestAction: CoachAction = "call";
  let bestRaiseSizeBb: number | null = null;

  if (state.facing) {
    if (edge > D.raiseEdgeMin && equity > D.raiseEquityMin) {
      bestAction = "raise";
      bestRaiseSizeBb = Math.max(state.facing.sizeBb * D.raiseMultiplier, D.raiseMinBb);
    } else if (edge > D.callEdgeMin) {
      bestAction = "call";
    } else {
      bestAction = "fold";
    }
  } else {
    if (equity + posAggression > D.openThreshold || allChecked || allFolded) {
      bestAction = "raise";
      bestRaiseSizeBb = Math.max(D.openMinBb, Math.round(state.potBb * D.openPotFraction));
    } else {
      bestAction = "call";
    }
  }

  if (preflopProfile) {
    const facing = state.facing;
    const strength = preflopProfile.strength;
    if (strength >= P.raiseStrength) {
      bestAction = "raise";
      bestRaiseSizeBb = facing
        ? Math.max(facing.sizeBb * P.raiseMultiplier, P.raiseMinBb)
        : Math.max(P.openMinBb, Math.round(state.potBb * P.openPotFraction));
    } else if (strength >= P.aggressiveStrength) {
      if (facing) {
        bestAction = edge > P.aggressiveEdgeMin ? "raise" : "call";
        bestRaiseSizeBb = bestAction === "raise" ? Math.max(facing.sizeBb * P.aggressiveMultiplier, P.aggressiveMinBb) : null;
      } else {
        bestAction = "raise";
        bestRaiseSizeBb = Math.max(P.aggressiveOpenMinBb, Math.round(state.potBb * P.aggressiveOpenPotFraction));
      }
    } else if (strength >= P.callStrength) {
      bestAction = "call";
      bestRaiseSizeBb = null;
    } else {
      bestAction = "fold";
      bestRaiseSizeBb = null;
    }
  }

  return { bestAction, bestRaiseSizeBb };
}
