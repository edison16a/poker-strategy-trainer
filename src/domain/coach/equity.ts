import type { Card, TrainingState } from "../types";
import { boardCardsFromView, formatCards, rankValue } from "../cards";
import { evaluateHand, type HandEval } from "../hand-eval";
import { fmt } from "../text";
import { COACH } from "@/data/coach";

const T = COACH.tuning;

/** Share of the pot the hero must win to break even on a call, in percent. */
export function potOddsPct(pot: number, facing: number | null): number {
  if (!facing || pot <= 0) return 0;
  return (facing / (pot + facing)) * 100;
}

/** Rank values of the visible community cards. */
export function boardRanks(state: TrainingState): number[] {
  return boardCardsFromView(state.board).map(c => rankValue(c.r));
}

export function heroCards(state: TrainingState): Card[] {
  return [...state.heroHand, ...boardCardsFromView(state.board)];
}

export function heroHandEval(state: TrainingState): HandEval {
  return evaluateHand(heroCards(state));
}

export type MadeHandEquity = { equity: number; note: string; detail?: string };

/**
 * Rough equity from the made hand alone. Pairs are graded against the
 * board (top pair is worth more than a low pair), and earlier streets are
 * discounted because more cards are still to come.
 */
export function equityFromMadeHand(handEval: HandEval, state: TrainingState): MadeHandEquity {
  const base = T.madeHandEquity as Record<HandEval["category"], number>;
  let equity = base[handEval.category] ?? T.madeHandDefaultEquity;
  const ranks = boardRanks(state);
  const boardHigh = Math.max(...ranks, 0);
  const boardSecond = ranks.sort((a, b) => b - a)[1] ?? boardHigh;

  let detail = handEval.label;
  const detailCopy = COACH.copy.madeHandDetail;

  if (handEval.category === "ONE_PAIR") {
    const pairRank = handEval.scoreVector[1] ?? 0;
    if (pairRank >= boardHigh) {
      equity += T.onePair.topPair;
      detail = detailCopy.topPair;
    } else if (pairRank >= boardHigh - 1) {
      equity += T.onePair.secondPair;
      detail = detailCopy.secondPair;
    } else if (pairRank >= boardSecond) {
      equity += T.onePair.middlePair;
      detail = detailCopy.middlePair;
    } else {
      equity += T.onePair.lowPair;
      detail = detailCopy.lowPair;
    }
    equity = Math.min(T.onePair.cap, equity);
  } else if (handEval.category === "TWO_PAIR") {
    const topPair = handEval.scoreVector[1] ?? 0;
    if (topPair >= boardHigh) equity += T.twoPair.topPairBonus;
    detail = topPair >= T.twoPair.highKickerRank ? detailCopy.topTwo : detailCopy.twoPair;
    equity = Math.min(T.twoPair.cap, equity);
  } else if (handEval.category === "THREE_OF_A_KIND") {
    equity = Math.max(equity, T.tripsFloor);
  }

  if (state.street === "FLOP") equity = Math.max(equity - T.streetVolatility.FLOP, 0);
  if (state.street === "TURN") equity = Math.max(equity - T.streetVolatility.TURN, 0);

  return { equity, note: handEval.label, detail };
}

/**
 * Hero equity estimate with the notes the coach shows. Draw equity from
 * the outs info can only raise the estimate, never lower it. The caller
 * passes the hero's evaluation so it is computed once per decision.
 */
export function equityEstimate(state: TrainingState, heroEval: HandEval): { equity: number; notes: string[] } {
  const notesCopy = COACH.copy.notes;
  const made = equityFromMadeHand(heroEval, state);
  const notes: string[] = [
    fmt(notesCopy.madeHand, { note: made.note }) + (made.detail ? fmt(notesCopy.madeHandDetail, { detail: made.detail }) : ""),
  ];
  const boardString = formatCards(boardCardsFromView(state.board));
  notes.push(boardString ? fmt(notesCopy.boardTexture, { board: boardString }) : notesCopy.noBoard);

  let equity = made.equity;
  if (state.outsInfo) {
    notes.push(fmt(notesCopy.drawOuts, {
      outs: state.outsInfo.correctOuts,
      label: state.outsInfo.drawLabel,
      pct: state.outsInfo.equityApproxPct,
    }));
    equity = Math.max(equity, state.outsInfo.equityApproxPct);
  }

  return { equity, notes };
}
