import { NextResponse } from "next/server";
import type { CoachResponse, TrainingState, PlayerAction, Card } from "@/lib/types";
import { cardToString, rankValue } from "@/lib/cards";
import { evaluateHand, type HandEval } from "@/lib/showdown";

type ReqBody = {
  state: TrainingState;
  heroAction: PlayerAction;
  raiseSizeBb?: number | null;
  outsAnswer?: number | null;
};

function clampScore(n: number) {
  if (!Number.isFinite(n)) return 60;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function potOddsPct(pot: number, facing: number | null) {
  if (!facing || pot <= 0) return 0;
  return (facing / (pot + facing)) * 100;
}

function boardRanks(state: TrainingState) {
  const cards = [
    ...(state.board.flop ?? []),
    state.board.turn,
    state.board.river,
  ].filter(Boolean) as { r: any }[];
  return cards.map(c => rankValue(c.r));
}

function equityFromMadeHand(handEval: HandEval, state: TrainingState): { equity: number; note: string; detail?: string } {
  const base: Record<HandEval["category"], number> = {
    HIGH_CARD: 25,
    ONE_PAIR: 50,
    TWO_PAIR: 80,
    THREE_OF_A_KIND: 88,
    STRAIGHT: 90,
    FLUSH: 94,
    FULL_HOUSE: 97,
    FOUR_OF_A_KIND: 99,
    STRAIGHT_FLUSH: 100,
  };

  let equity = base[handEval.category] ?? 50;
  const ranks = boardRanks(state);
  const boardHigh = Math.max(...ranks, 0);
  const boardSecond = ranks.sort((a, b) => b - a)[1] ?? boardHigh;

  let detail = handEval.label;

  if (handEval.category === "ONE_PAIR") {
    const pairRank = handEval.scoreVector[1] ?? 0;
    if (pairRank >= boardHigh) {
      equity += 12; // top pair / overpair
      detail = "Top pair/overpair";
    } else if (pairRank >= boardHigh - 1) {
      equity += 6;
      detail = "Second pair";
    } else if (pairRank >= boardSecond) {
      equity -= 4;
      detail = "Middle pair (vulnerable)";
    } else {
      equity -= 10;
      detail = "Low pair—thin value";
    }
    equity = Math.min(86, equity);
  } else if (handEval.category === "TWO_PAIR") {
    const topPair = handEval.scoreVector[1] ?? 0;
    if (topPair >= boardHigh) equity += 6;
    detail = topPair >= 12 ? "Top two with high kickers" : "Two pair";
    equity = Math.min(94, equity);
  } else if (handEval.category === "THREE_OF_A_KIND") {
    equity = Math.max(equity, 90);
  }

  // Earlier streets carry some volatility
  if (state.street === "FLOP") equity = Math.max(equity - 6, 0);
  if (state.street === "TURN") equity = Math.max(equity - 3, 0);

  return { equity, note: handEval.label, detail };
}

function equityEstimate(state: TrainingState): { equity: number; notes: string[] } {
  const heroEval = evaluateHand([
    ...state.heroHand,
    ...(state.board.flop ?? []),
    state.board.turn,
    state.board.river,
  ].filter(Boolean) as Card[]);

  const made = equityFromMadeHand(heroEval, state);
  const notes: string[] = [`Made hand: ${made.note}${made.detail ? ` (${made.detail})` : ""}`];
  const boardText = (state.board.flop ?? []).map(cardToString);
  if (state.board.turn) boardText.push(cardToString(state.board.turn));
  if (state.board.river) boardText.push(cardToString(state.board.river));
  const boardString = boardText.join(" ");
  notes.push(boardString ? `Board texture: ${boardString}` : "No board cards yet.");

  let equity = made.equity;
  if (state.outsInfo) {
    notes.push(`Draw outs: ${state.outsInfo.correctOuts} (${state.outsInfo.drawLabel}) ≈ ${state.outsInfo.equityApproxPct}%.`);
    equity = Math.max(equity, state.outsInfo.equityApproxPct);
  }

  return { equity, notes };
}

function evaluateDecision(state: TrainingState, heroAction: PlayerAction, raiseSizeBb?: number | null): CoachResponse {
  const potOdds = potOddsPct(state.potBb, state.facing?.sizeBb ?? null);
  const equityInfo = equityEstimate(state);
  const equity = equityInfo.equity;
  const edge = equity - potOdds;
  const heroEval = evaluateHand([
    ...state.heroHand,
    ...(state.board.flop ?? []),
    state.board.turn,
    state.board.river,
  ].filter(Boolean) as Card[]);

  const posAggression =
    state.heroPos === "BTN" || state.heroPos === "CO" ? 4 :
    state.heroPos === "HJ" ? 2 : 0;

  const oppAggression = state.opponentActions.filter(a => a.action === "BET" || a.action === "RAISE").length;
  const allChecked = state.opponentActions.every(a => a.action === "CHECK");
  const allFolded = state.opponentActions.every(a => a.action === "FOLD");
  const facingPctPot = state.facing ? (state.facing.sizeBb / Math.max(1, state.potBb + state.facing.sizeBb)) * 100 : 0;

  let bestAction: "fold" | "call" | "raise" = "call";
  let bestRaiseSizeBb: number | null = null;

  if (state.facing) {
    if (edge > 10 && equity > 55) {
      bestAction = "raise";
      bestRaiseSizeBb = Math.max(state.facing.sizeBb * 2.2, 4);
    } else if (edge > -5) {
      bestAction = "call";
    } else {
      bestAction = "fold";
    }
  } else {
    if (equity + posAggression > 70 || allChecked || allFolded) {
      bestAction = "raise";
      bestRaiseSizeBb = Math.max(3, Math.round(state.potBb * 0.55));
    } else {
      bestAction = "call";
    }
  }

  const heroCategoryBoost: Record<HandEval["category"], number> = {
    STRAIGHT_FLUSH: 24,
    FOUR_OF_A_KIND: 22,
    FULL_HOUSE: 20,
    FLUSH: 16,
    STRAIGHT: 14,
    THREE_OF_A_KIND: 12,
    TWO_PAIR: 10,
    ONE_PAIR: 4,
    HIGH_CARD: 0,
  };
  let madeBoost = heroCategoryBoost[heroEval.category] ?? 0;
  if (heroEval.category === "TWO_PAIR") {
    const hi = heroEval.scoreVector[1] ?? 0;
    const lo = heroEval.scoreVector[2] ?? 0;
    if (hi >= 13 && lo >= 11) madeBoost += 6; // top two with big cards
  }
  if (heroEval.category === "ONE_PAIR") {
    const pairRank = heroEval.scoreVector[1] ?? 0;
    const boardHigh = Math.max(...boardRanks(state), 0);
    if (pairRank >= boardHigh) madeBoost += 4; // top pair/overpair
    else if (pairRank >= boardHigh - 1) madeBoost += 2;
  }

  const texturePenalty = (() => {
    const board = boardRanks(state);
    const suits = [
      ...(state.board.flop ?? []),
      state.board.turn,
      state.board.river,
    ].filter(Boolean).map(c => c.s);
    const suitCounts: Record<string, number> = {};
    suits.forEach(s => { suitCounts[s] = (suitCounts[s] ?? 0) + 1; });
    const twoTone = Object.values(suitCounts).some(c => c >= 2);
    const connected = (() => {
      const sorted = Array.from(new Set(board)).sort((a, b) => a - b);
      for (let i = 1; i < sorted.length; i++) {
        if (sorted[i] - sorted[i - 1] <= 2) return true;
      }
      return false;
    })();
    let penalty = 0;
    if (twoTone) penalty += 3;
    if (connected) penalty += 3;
    if (state.street === "FLOP") penalty += 2; // more future cards to dodge
    if (state.street === "TURN") penalty += 1;
    return penalty;
  })();

  const alignment =
    (heroAction === "RAISE" && bestAction === "raise") || (heroAction === "CALL" && bestAction === "call") || (heroAction === "FOLD" && bestAction === "fold")
      ? 14
      : heroAction === "RAISE" && bestAction === "call"
      ? -6
      : heroAction === "CALL" && bestAction === "raise"
      ? -5
      : -14;

  // Pressure/disciplined adjustments
  let discipline = 0;
  if (state.facing) {
    if (equity < potOdds - 10) discipline -= 12;
    if (facingPctPot > 60 && equity < 50) discipline -= 6;
    if (oppAggression >= 2 && equity < 55) discipline -= 4;
  }

  const scoreBase = 54 + edge * 0.45 + posAggression + discipline + madeBoost * 0.5 - texturePenalty;
  const score = clampScore(scoreBase + alignment + 10); // bias upward so best decisions land 80+
  const verdict: CoachResponse["verdict"] =
    score >= 95 ? "perfect"
    : score >= 80 ? "great"
    : score >= 60 ? "good"
    : score >= 50 ? "neutral"
    : score >= 30 ? "not-ideal"
    : "bad";

  const reasons: string[] = [];
  const heroStr = state.heroHand.map(cardToString).join(" ");
  const boardStr = [
    ...(state.board.flop ?? []).map(cardToString),
    state.board.turn ? cardToString(state.board.turn) : "",
    state.board.river ? cardToString(state.board.river) : "",
  ].filter(Boolean).join(" ");

  const futureCards =
    state.street === "PREFLOP" ? "3 streets to come" :
    state.street === "FLOP" ? "turn + river to come" :
    state.street === "TURN" ? "river to come" : "showdown card already dealt";

  reasons.push(`Hand: ${heroStr}${boardStr ? ` on ${boardStr}` : ""}. ${heroEval.label} (${futureCards}). Pot odds need ~${potOdds.toFixed(1)}% equity; estimated strength is ~${equity.toFixed(1)}%.`);
  reasons.push(...equityInfo.notes);
  if (state.facing) {
    reasons.push(`Facing ${state.facing.type.toLowerCase()} of ~${facingPctPot.toFixed(1)}% pot; opponents aggression: ${oppAggression} bets/raises.`);
  }
  if (state.outsInfo) {
    reasons.push(`Draws: ${state.outsInfo.correctOuts} outs (${state.outsInfo.drawLabel}) ≈ ${state.outsInfo.equityApproxPct}% to improve.`);
  }
  reasons.push(
    bestAction === "raise"
      ? `Raising with ${heroStr} vs ${boardStr || "no board"} leverages fold equity and pushes value from worse hands; strong made hand supports aggression.`
      : bestAction === "call"
      ? `Calling keeps dominated hands in; ${heroStr}${boardStr ? ` retains ~${equity.toFixed(1)}% versus the price` : ""}.`
      : `Folding is best: ${heroStr} lacks equity versus the price and aggression shown.`
  );
  const trimmedReasons = reasons.slice(0, 4);

  const conceptTags: string[] = [
    edge >= 0 ? "pot-odds+" : "pot-odds-",
    state.outsInfo ? "draws" : "made-hand",
    bestAction === "raise" ? "value/semibluff" : bestAction === "fold" ? "discipline" : "realize-equity",
  ];

  return {
    score,
    verdict,
    bestAction,
    bestRaiseSizeBb,
    reasons: trimmedReasons,
    conceptTags,
    coachSummary:
      verdict === "good"
        ? "Strong line versus pot odds and position."
        : verdict === "neutral"
        ? "Playable decision; small tweaks in sizing/line could add EV."
        : "Line loses EV against the price offered; consider tighter folds or delayed aggression.",
  };
}

export async function POST(req: Request) {
  const body = (await req.json()) as ReqBody;
  const { state, heroAction, raiseSizeBb } = body;

  const out = evaluateDecision(state, heroAction, raiseSizeBb ?? null);
  return NextResponse.json(out);
}
