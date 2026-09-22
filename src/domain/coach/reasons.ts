import type { CoachAction, CoachVerdict, TrainingState } from "../types";
import { boardCardsFromView, cardToString } from "../cards";
import type { HandEval } from "../hand-eval";
import { fmt } from "../text";
import type { PreflopProfile } from "./preflop";
import { COACH } from "@/data/coach";

const R = COACH.copy.reasons;

export type ReasonInputs = {
  state: TrainingState;
  heroEval: HandEval;
  bestAction: CoachAction;
  equity: number;
  potOdds: number;
  edge: number;
  facingPctPot: number;
  oppAggression: number;
  equityNotes: string[];
  preflopProfile: PreflopProfile | null;
};

/**
 * The explanation bullets, most important first, capped at the configured
 * count. Order matters because the cap trims from the end: the hand summary
 * and equity notes always survive, the draw and line advice may not.
 */
export function buildReasons(i: ReasonInputs): string[] {
  const { state, heroEval, bestAction, equity, potOdds, edge, facingPctPot, oppAggression } = i;
  const reasons: string[] = [];
  const heroStr = state.heroHand.map(cardToString).join(" ");
  const boardStr = boardCardsFromView(state.board).map(cardToString).join(" ");

  reasons.push(fmt(R.hand, {
    hand: heroStr,
    onBoard: boardStr ? fmt(R.onBoard, { board: boardStr }) : "",
    madeHand: heroEval.label,
    futureCards: COACH.copy.futureCards[state.street],
    potOdds: potOdds.toFixed(1),
    equity: equity.toFixed(1),
  }));
  reasons.push(...i.equityNotes);
  if (i.preflopProfile) {
    reasons.push(fmt(R.preflopPlan, { label: i.preflopProfile.label }));
  }
  if (state.facing) {
    reasons.push(fmt(R.facing, {
      type: state.facing.type.toLowerCase(),
      facingPct: facingPctPot.toFixed(1),
      aggressors: oppAggression,
    }));
    reasons.push(fmt(R.potOddsMath, {
      bet: state.facing.sizeBb.toFixed(2),
      pot: state.potBb.toFixed(2),
      required: potOdds.toFixed(1),
      equity: equity.toFixed(1),
      evSign: edge >= 0 ? R.evPositive : R.evNegative,
    }));
  }
  if (state.outsInfo) {
    const pct = state.outsInfo.equityApproxPct;
    reasons.push(fmt(R.draws, { outs: state.outsInfo.correctOuts, label: state.outsInfo.drawLabel, pct }));
    if (state.facing) {
      reasons.push(fmt(R.ruleOfFour, { pct, potOdds: potOdds.toFixed(1) }));
    } else {
      reasons.push(fmt(R.drawNoBet, { pct }));
    }
  }
  reasons.push(
    bestAction === "raise"
      ? fmt(R.bestRaise, { hand: heroStr, board: boardStr || R.noBoard })
      : bestAction === "call"
      ? fmt(R.bestCall, { hand: heroStr, retains: boardStr ? fmt(R.bestCallRetains, { equity: equity.toFixed(1) }) : "" })
      : fmt(R.bestFold, { hand: heroStr }),
  );
  return reasons.slice(0, COACH.tuning.maxReasons);
}

/** Short concept labels shown as chips under the feedback. */
export function conceptTags(
  edge: number,
  hasDraw: boolean,
  bestAction: CoachAction,
  preflopProfile: PreflopProfile | null,
): string[] {
  const G = COACH.copy.tags;
  const tags = [
    edge >= 0 ? G.potOddsPositive : G.potOddsNegative,
    hasDraw ? G.draws : G.madeHand,
    bestAction === "raise" ? G.raise : bestAction === "fold" ? G.fold : G.call,
  ];
  if (preflopProfile) {
    tags.push(preflopProfile.tier === "trash" ? G.preflopTrash : G.preflopPlayable);
  }
  return tags;
}

/**
 * One-line summary keyed by verdict.
 *
 * Before the fix only "good" got the positive summary; "perfect" and
 * "great" fell through to the "line loses EV" text, so the best decisions
 * were told they were losing. Every verdict at or above "good" is positive.
 */
export function coachSummary(verdict: CoachVerdict): string {
  const S = COACH.copy.summaries;
  if (verdict === "perfect" || verdict === "great" || verdict === "good") return S.good;
  return verdict === "neutral" ? S.neutral : S.other;
}
