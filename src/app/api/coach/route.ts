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

type PreflopTier = "premium" | "strong" | "speculative" | "trash";

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

function preflopHandProfile(hand: TrainingState["heroHand"]): { tier: PreflopTier; strength: number; equityHint: number; label: string } {
  const [c1, c2] = hand;
  const v1 = rankValue(c1.r);
  const v2 = rankValue(c2.r);
  const hi = Math.max(v1, v2);
  const lo = Math.min(v1, v2);
  const suited = c1.s === c2.s;
  const pair = v1 === v2;
  const gap = Math.abs(v1 - v2);
  const handStr = hand.map(cardToString).join(" ");

  if (pair) {
    if (hi >= 13) return { tier: "premium", strength: 95, equityHint: 82, label: `Premium pair (${handStr})` };
    if (hi >= 10) return { tier: "strong", strength: 86, equityHint: 76, label: `High pair (${handStr})` };
    if (hi >= 7) return { tier: "strong", strength: 78, equityHint: 70, label: `Medium pair (${handStr})` };
    return { tier: "speculative", strength: 68, equityHint: 62, label: `Small pair (${handStr})` };
  }

  const isBroadway = hi >= 13 && lo >= 10;
  const hasAce = hi === 14;
  const suitedConnector = suited && gap === 1;
  const suitedOneGap = suited && gap === 2;

  if (isBroadway && suited) return { tier: "premium", strength: 88, equityHint: 74, label: `Suited broadway (${handStr})` };
  if (isBroadway) return { tier: "strong", strength: 80, equityHint: 68, label: `Broadway combo (${handStr})` };
  if (hasAce && suited && lo >= 9) return { tier: "strong", strength: 78, equityHint: 68, label: `Suited ace (${handStr})` };
  if (hasAce && suited && lo >= 5) return { tier: "speculative", strength: 70, equityHint: 60, label: `Wheel/weak suited ace (${handStr})` };
  if (hasAce && lo >= 10) return { tier: "strong", strength: 76, equityHint: 66, label: `Big ace (${handStr})` };
  if (suitedConnector && hi >= 9) return { tier: "strong", strength: 74, equityHint: 64, label: `Suited connectors (${handStr})` };
  if ((suitedConnector || suitedOneGap) && hi >= 8) return { tier: "speculative", strength: 66, equityHint: 58, label: `Suited connector/gapper (${handStr})` };
  if (suited && lo >= 7 && gap <= 3) return { tier: "speculative", strength: 62, equityHint: 56, label: `Suited hand (${handStr})` };
  if (hi >= 12 && lo >= 8) return { tier: "speculative", strength: 60, equityHint: 56, label: `Playable high cards (${handStr})` };

  return { tier: "trash", strength: 38, equityHint: 36, label: `Trash/ragged hand (${handStr})` };
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
  const preflopProfile = state.street === "PREFLOP" ? preflopHandProfile(state.heroHand) : null;
  const potOdds = potOddsPct(state.potBb, state.facing?.sizeBb ?? null);
  const equityInfo = equityEstimate(state);
  const equityNotes = preflopProfile
    ? [`Preflop strength: ${preflopProfile.label} (≈${preflopProfile.equityHint}% vs random).`, ...equityInfo.notes]
    : equityInfo.notes;
  let equity = equityInfo.equity;
  if (preflopProfile) {
    equity = Math.max(equity, preflopProfile.equityHint);
  }
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

  if (preflopProfile) {
    const facingBet = Boolean(state.facing);
    const strength = preflopProfile.strength;
    if (strength >= 80) {
      bestAction = "raise";
      bestRaiseSizeBb = facingBet && state.facing
        ? Math.max(state.facing.sizeBb * 2.3, 4)
        : Math.max(3, Math.round(state.potBb * 0.65));
    } else if (strength >= 70) {
      if (facingBet && state.facing) {
        bestAction = edge > -8 ? "raise" : "call";
        bestRaiseSizeBb = bestAction === "raise" ? Math.max(state.facing.sizeBb * 2.1, 3) : null;
      } else {
        bestAction = "raise";
        bestRaiseSizeBb = Math.max(3, Math.round(state.potBb * 0.55));
      }
    } else if (strength >= 58) {
      bestAction = "call";
      bestRaiseSizeBb = null;
    } else {
      bestAction = "fold";
      bestRaiseSizeBb = null;
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

  const vulnerabilityPenalty = (() => {
    if (heroEval.category === "ONE_PAIR") {
      const pairRank = heroEval.scoreVector[1] ?? 0;
      const boardHigh = Math.max(...boardRanks(state), 0);
      if (pairRank < boardHigh - 1) return 8;
      if (pairRank < boardHigh) return 6;
    }
    if (heroEval.category === "HIGH_CARD") return 10;
    return 0;
  })();

  const texturePenalty = (() => {
    const board = boardRanks(state);
    const suits = [
      ...(state.board.flop ?? []),
      state.board.turn,
      state.board.river,
    ].filter((c): c is Card => Boolean(c)).map(c => c.s);
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

  const preflopBonus = preflopProfile ? (() => {
    if (heroAction === "FOLD") {
      if (preflopProfile.tier === "trash") return 22;
      if (preflopProfile.tier === "speculative" && state.facing) return 12;
    }
    if (heroAction === "CALL") {
      if (preflopProfile.tier === "speculative") return 8;
      if (preflopProfile.tier === "strong" && state.facing) return 10;
    }
    if (heroAction === "RAISE") {
      if (preflopProfile.tier === "premium") return 20;
      if (preflopProfile.tier === "strong") return 12;
    }
    return 0;
  })() : 0;

  const scoreBase = 52 + edge * 0.35 + posAggression + discipline + madeBoost * 0.45 - texturePenalty - vulnerabilityPenalty;
  let score = clampScore(scoreBase + alignment + 10 + preflopBonus); // bias upward so best decisions land 80+

  // If user matched the best action, ensure they are not graded below 50 (correct line even if thin/losing).
  const matchedBest = (heroAction === "RAISE" && bestAction === "raise") || (heroAction === "CALL" && bestAction === "call") || (heroAction === "FOLD" && bestAction === "fold");
  if (matchedBest) score = Math.max(score, 50);
  if (preflopProfile) {
    if (heroAction === "FOLD" && preflopProfile.tier === "trash") score = Math.max(score, 72);
    if (heroAction === "RAISE" && (preflopProfile.tier === "strong" || preflopProfile.tier === "premium")) {
      score = Math.max(score, preflopProfile.tier === "premium" ? 82 : 72);
    }
  }
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
  reasons.push(...equityNotes);
  if (preflopProfile) {
    reasons.push(`Preflop plan: ${preflopProfile.label}. Folding rags keeps Elo intact; aggression is rewarded when starting hand strength warrants it.`);
  }
  if (state.facing) {
    reasons.push(`Facing ${state.facing.type.toLowerCase()} of ~${facingPctPot.toFixed(1)}% pot; opponents aggression: ${oppAggression} bets/raises.`);
    const requiredEquity = potOdds;
    reasons.push(`Pot odds math: calling ${state.facing.sizeBb.toFixed(2)} into ${state.potBb.toFixed(2)} needs ~${requiredEquity.toFixed(1)}% equity; your line assumes ~${equity.toFixed(1)}%, so EV is ${edge >= 0 ? "positive" : "negative"} over time.`);
  }
  if (state.outsInfo) {
    reasons.push(`Draws: ${state.outsInfo.correctOuts} outs (${state.outsInfo.drawLabel}) ≈ ${state.outsInfo.equityApproxPct}% to improve.`);
    if (state.facing) {
      reasons.push(`Rule of 4/2 check: outs imply ~${state.outsInfo.equityApproxPct}% by river; compare to the ~${potOdds.toFixed(1)}% needed to justify a call/raise this street.`);
    } else {
      reasons.push(`With no bet to face, your draw equity (~${state.outsInfo.equityApproxPct}%) makes betting an option to add fold equity or checking to realize your card for free.`);
    }
  }
  reasons.push(
    bestAction === "raise"
      ? `Raising with ${heroStr} vs ${boardStr || "no board"} leverages fold equity and pushes value from worse hands; strong made hand supports aggression.`
      : bestAction === "call"
      ? `Calling keeps dominated hands in; ${heroStr}${boardStr ? ` retains ~${equity.toFixed(1)}% versus the price` : ""}.`
      : `Folding is best: ${heroStr} lacks equity versus the price and aggression shown.`
  );
  const trimmedReasons = reasons.slice(0, 6);

  let conceptTags: string[] = [
    edge >= 0 ? "pot-odds+" : "pot-odds-",
    state.outsInfo ? "draws" : "made-hand",
    bestAction === "raise" ? "value/semibluff" : bestAction === "fold" ? "discipline" : "realize-equity",
  ];
  if (preflopProfile) {
    conceptTags = [...conceptTags, preflopProfile.tier === "trash" ? "preflop-discipline" : "preflop-starting-hand"];
  }

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
