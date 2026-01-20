import { NextResponse } from "next/server";
import type { CoachResponse, TrainingState, PlayerAction } from "@/lib/types";
import { cardToString, rankValue } from "@/lib/cards";

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

function handTextureStrength(state: TrainingState): { strength: number; descriptors: string[] } {
  const cards = [
    ...state.heroHand,
    ...(state.board.flop ?? []),
    state.board.turn,
    state.board.river,
  ].filter(Boolean) as { r: any; s: any }[];

  const counts: Record<string, number> = {};
  for (const c of cards) counts[c.r] = (counts[c.r] ?? 0) + 1;
  const maxCount = Math.max(...Object.values(counts), 0);

  let strength = 35;
  const descriptors: string[] = [];
  if (maxCount >= 4) {
    strength = 96;
    descriptors.push("Made hand: quads/full house threat");
  } else if (maxCount === 3) {
    strength = 84;
    descriptors.push("Made hand: trips/set");
  } else if (maxCount === 2) {
    strength = 74;
    descriptors.push("Made hand: one pair/two pair potential (pocket pairs get a bonus).");
    // Pocket pair bonus for overpairs to the board
    const boardRanks = (state.board.flop ?? []).map(c => rankValue(c.r));
    const pocketPair = state.heroHand[0].r === state.heroHand[1].r;
    if (pocketPair) {
      const pairRank = rankValue(state.heroHand[0].r);
      const boardHigh = Math.max(...(boardRanks.length ? boardRanks : [0]));
      if (pairRank > boardHigh) {
        strength += 12; // overpair strength bump
        descriptors.push("Overpair to the board adds showdown value.");
      }
    }
  } else {
    descriptors.push("High card / draw-dependent");
  }

  const high = Math.max(...state.heroHand.map(c => rankValue(c.r)));
  strength += Math.max(0, (high - 10) * 1.8);

  // Board pressure: paired and suited boards reduce raw strength a bit.
  const boardCounts: Record<string, number> = {};
  for (const c of (state.board.flop ?? [])) boardCounts[c.r] = (boardCounts[c.r] ?? 0) + 1;
  if (Object.values(boardCounts).some(c => c >= 2)) {
    strength -= 5;
    descriptors.push("Paired board increases variance");
  }

  return { strength: Math.min(98, Math.max(20, strength)), descriptors };
}

function equityEstimate(state: TrainingState): { equity: number; notes: string[] } {
  if (state.outsInfo) {
    return {
      equity: state.outsInfo.equityApproxPct,
      notes: [`Outs: ${state.outsInfo.correctOuts} (${state.outsInfo.drawLabel}) ≈ ${state.outsInfo.equityApproxPct}% equity.`],
    };
  }
  const { strength, descriptors } = handTextureStrength(state);
  return { equity: strength, notes: descriptors };
}

function evaluateDecision(state: TrainingState, heroAction: PlayerAction, raiseSizeBb?: number | null): CoachResponse {
  const potOdds = potOddsPct(state.potBb, state.facing?.sizeBb ?? null);
  const equityInfo = equityEstimate(state);
  const equity = equityInfo.equity;
  const edge = equity - potOdds;

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

  const alignment =
    (heroAction === "RAISE" && bestAction === "raise") || (heroAction === "CALL" && bestAction === "call") || (heroAction === "FOLD" && bestAction === "fold")
      ? 14
      : heroAction === "RAISE" && bestAction === "call"
      ? -8
      : heroAction === "CALL" && bestAction === "raise"
      ? -6
      : -14;

  // Pressure/disciplined adjustments
  let discipline = 0;
  if (state.facing) {
    if (equity < potOdds - 10) discipline -= 12;
    if (facingPctPot > 60 && equity < 50) discipline -= 6;
    if (oppAggression >= 2 && equity < 55) discipline -= 4;
  }

  const scoreBase = 62 + edge * 0.5 + posAggression + discipline;
  const score = clampScore(scoreBase + alignment + 10); // bias upward so best decisions land 80+
  const verdict: CoachResponse["verdict"] =
    score >= 80 ? "good" : score >= 55 ? "neutral" : "bad";

  const reasons: string[] = [];
  const heroStr = state.heroHand.map(cardToString).join(" ");
  const boardStr = [
    ...(state.board.flop ?? []).map(cardToString),
    state.board.turn ? cardToString(state.board.turn) : "",
    state.board.river ? cardToString(state.board.river) : "",
  ].filter(Boolean).join(" ");

  reasons.push(`Hand: ${heroStr}${boardStr ? ` on ${boardStr}` : ""}. Pot odds need ~${potOdds.toFixed(1)}% equity; estimated strength is ~${equity.toFixed(1)}%.`);
  reasons.push(...equityInfo.notes);
  if (state.facing) {
    reasons.push(`Facing ${state.facing.type.toLowerCase()} of ~${facingPctPot.toFixed(1)}% pot; opponents aggression: ${oppAggression} bets/raises.`);
  }
  if (state.outsInfo) {
    reasons.push(`Draws: ${state.outsInfo.correctOuts} outs (${state.outsInfo.drawLabel}) ≈ ${state.outsInfo.equityApproxPct}% to improve.`);
  }
  reasons.push(
    bestAction === "raise"
      ? `Raising with ${heroStr} vs ${boardStr || "no board"} leverages fold equity when ahead and denies equity to worse draws.`
      : bestAction === "call"
      ? `Calling keeps dominated hands in; ${heroStr}${boardStr ? ` still has ${equity.toFixed(1)}% versus the price` : ""}.`
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
