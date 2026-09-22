import type { CoachResponse, PlayerAction, TrainingState } from "../types";
import { COACH_AGGRESSION_BONUS } from "@/data/positions";
import { COACH } from "@/data/coach";
import { fmt } from "../text";
import { preflopHandProfile } from "./preflop";
import { equityEstimate, heroHandEval, potOddsPct } from "./equity";
import { decideBestLine } from "./decide";
import {
  alignmentScore, applyScoreFloors, disciplinePenalty, madeHandBoost, preflopBonus,
  rawScore, texturePenalty, verdictForScore, vulnerabilityPenalty,
} from "./score";
import { buildReasons, coachSummary, conceptTags } from "./reasons";

export type { PreflopProfile } from "./preflop";
export { preflopHandProfile } from "./preflop";
export { potOddsPct, equityEstimate, equityFromMadeHand } from "./equity";
export { decideBestLine } from "./decide";
export { verdictForScore, clampScore } from "./score";

/**
 * Grades a decision.
 *
 * Steps: estimate equity (made hand, draws, preflop table), compare it to
 * the price being offered, pick the line the coach would take, then score
 * the player's action against it with credits for hand strength and
 * position and penalties for texture, vulnerability and indiscipline.
 * Floors keep correct lines from grading badly in losing spots.
 *
 * The hero's raise size is accepted for API compatibility but is not used
 * by the grading; that is a known gap, not an oversight in the move.
 */
export function evaluateDecision(state: TrainingState, heroAction: PlayerAction, _raiseSizeBb?: number | null): CoachResponse {
  void _raiseSizeBb;
  const preflopProfile = state.street === "PREFLOP" ? preflopHandProfile(state.heroHand) : null;
  const potOdds = potOddsPct(state.potBb, state.facing?.sizeBb ?? null);
  const equityInfo = equityEstimate(state);
  const equityNotes = preflopProfile
    ? [
        fmt(COACH.copy.notes.preflopStrength, { label: preflopProfile.label, equity: preflopProfile.equityHint }),
        ...equityInfo.notes,
      ]
    : equityInfo.notes;
  let equity = equityInfo.equity;
  if (preflopProfile) {
    equity = Math.max(equity, preflopProfile.equityHint);
  }
  const edge = equity - potOdds;
  const heroEval = heroHandEval(state);

  const posAggression = COACH_AGGRESSION_BONUS[state.heroPos];
  const oppAggression = state.opponentActions.filter(a => a.action === "BET" || a.action === "RAISE").length;
  const facingPctPot = state.facing ? (state.facing.sizeBb / Math.max(1, state.potBb + state.facing.sizeBb)) * 100 : 0;

  const { bestAction, bestRaiseSizeBb } = decideBestLine(state, equity, edge, posAggression, preflopProfile);

  let score = rawScore({
    edge,
    posAggression,
    discipline: disciplinePenalty(state, equity, potOdds, facingPctPot, oppAggression),
    madeBoost: madeHandBoost(heroEval, state),
    texture: texturePenalty(state),
    vulnerability: vulnerabilityPenalty(heroEval, state),
    alignment: alignmentScore(heroAction, bestAction),
    preflopBonus: preflopBonus(preflopProfile, heroAction, Boolean(state.facing)),
  });
  score = applyScoreFloors(score, heroAction, bestAction, preflopProfile);
  const verdict = verdictForScore(score);

  const reasons = buildReasons({
    state, heroEval, bestAction, equity, potOdds, edge, facingPctPot, oppAggression, equityNotes, preflopProfile,
  });

  return {
    score,
    verdict,
    bestAction,
    bestRaiseSizeBb,
    reasons,
    conceptTags: conceptTags(edge, Boolean(state.outsInfo), bestAction, preflopProfile),
    coachSummary: coachSummary(verdict),
  };
}
