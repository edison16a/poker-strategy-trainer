import type { CoachAction, CoachVerdict, PlayerAction, TrainingState } from "../types";
import { boardCardsFromView } from "../cards";
import type { HandEval } from "../hand-eval";
import type { PreflopProfile } from "./preflop";
import { boardRanks } from "./equity";
import { COACH } from "@/data/coach";

const T = COACH.tuning;

/** Clamps to 0..100 and rounds; a non-finite input falls back to a neutral score. */
export function clampScore(n: number): number {
  if (!Number.isFinite(n)) return T.fallbackScore;
  return Math.max(0, Math.min(100, Math.round(n)));
}

/** Score credit for the strength of the made hand, with extra for top pair and top two. */
export function madeHandBoost(heroEval: HandEval, state: TrainingState): number {
  const table = T.heroCategoryBoost as Record<HandEval["category"], number>;
  let boost = table[heroEval.category] ?? 0;
  if (heroEval.category === "TWO_PAIR") {
    const hi = heroEval.scoreVector[1] ?? 0;
    const lo = heroEval.scoreVector[2] ?? 0;
    if (hi >= T.boost.topTwoHighRank && lo >= T.boost.topTwoLowRank) boost += T.boost.topTwoPair;
  }
  if (heroEval.category === "ONE_PAIR") {
    const pairRank = heroEval.scoreVector[1] ?? 0;
    const boardHigh = Math.max(...boardRanks(state), 0);
    if (pairRank >= boardHigh) boost += T.boost.topPair;
    else if (pairRank >= boardHigh - 1) boost += T.boost.secondPair;
  }
  return boost;
}

/** Penalty for hands that are easily outdrawn: weak pairs and no pair at all. */
export function vulnerabilityPenalty(heroEval: HandEval, state: TrainingState): number {
  if (heroEval.category === "ONE_PAIR") {
    const pairRank = heroEval.scoreVector[1] ?? 0;
    const boardHigh = Math.max(...boardRanks(state), 0);
    if (pairRank < boardHigh - 1) return T.vulnerability.lowPair;
    if (pairRank < boardHigh) return T.vulnerability.secondPair;
  }
  if (heroEval.category === "HIGH_CARD") return T.vulnerability.highCard;
  return 0;
}

/** Penalty for draw-heavy boards (two-tone, connected) and for cards still to come. */
export function texturePenalty(state: TrainingState): number {
  const board = boardRanks(state);
  const suits = boardCardsFromView(state.board).map(c => c.s);
  const suitCounts: Record<string, number> = {};
  suits.forEach(s => { suitCounts[s] = (suitCounts[s] ?? 0) + 1; });
  const twoTone = Object.values(suitCounts).some(c => c >= 2);
  const connected = (() => {
    const sorted = Array.from(new Set(board)).sort((a, b) => a - b);
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] - sorted[i - 1] <= T.texture.connectedGap) return true;
    }
    return false;
  })();
  let penalty = 0;
  if (twoTone) penalty += T.texture.twoTone;
  if (connected) penalty += T.texture.connected;
  if (state.street === "FLOP") penalty += T.texture.FLOP;
  if (state.street === "TURN") penalty += T.texture.TURN;
  return penalty;
}

export function matchesBest(heroAction: PlayerAction, bestAction: CoachAction): boolean {
  return heroAction.toLowerCase() === bestAction;
}

/** Credit for matching the recommended line; smaller penalties for near misses. */
export function alignmentScore(heroAction: PlayerAction, bestAction: CoachAction): number {
  if (matchesBest(heroAction, bestAction)) return T.alignment.match;
  if (heroAction === "RAISE" && bestAction === "call") return T.alignment.raiseWhenCall;
  if (heroAction === "CALL" && bestAction === "raise") return T.alignment.callWhenRaise;
  return T.alignment.other;
}

/** Penalties for continuing against a bet the hand cannot justify. */
export function disciplinePenalty(
  state: TrainingState,
  equity: number,
  potOdds: number,
  facingPctPot: number,
  oppAggression: number,
): number {
  if (!state.facing) return 0;
  const { underPriced, bigBetWeak, multiwayWeak } = T.discipline;
  let discipline = 0;
  if (equity < potOdds - underPriced.margin) discipline += underPriced.penalty;
  if (facingPctPot > bigBetWeak.facingPctMin && equity < bigBetWeak.equityMax) discipline += bigBetWeak.penalty;
  if (oppAggression >= multiwayWeak.aggressorsMin && equity < multiwayWeak.equityMax) discipline += multiwayWeak.penalty;
  return discipline;
}

/** Preflop credit for the disciplined play in each tier. */
export function preflopBonus(profile: PreflopProfile | null, heroAction: PlayerAction, facing: boolean): number {
  if (!profile) return 0;
  const B = T.preflopBonus;
  if (heroAction === "FOLD") {
    if (profile.tier === "trash") return B.foldTrash;
    if (profile.tier === "speculative" && facing) return B.foldSpeculativeFacing;
  }
  if (heroAction === "CALL") {
    if (profile.tier === "speculative") return B.callSpeculative;
    if (profile.tier === "strong" && facing) return B.callStrongFacing;
  }
  if (heroAction === "RAISE") {
    if (profile.tier === "premium") return B.raisePremium;
    if (profile.tier === "strong") return B.raiseStrong;
  }
  return 0;
}

export type ScoreInputs = {
  edge: number;
  posAggression: number;
  discipline: number;
  madeBoost: number;
  texture: number;
  vulnerability: number;
  alignment: number;
  preflopBonus: number;
};

/** Weighted sum of the components, biased upward so best decisions land 80+. */
export function rawScore(i: ScoreInputs): number {
  const S = T.score;
  const base = S.base + i.edge * S.edgeWeight + i.posAggression + i.discipline
    + i.madeBoost * S.madeBoostWeight - i.texture - i.vulnerability;
  return clampScore(base + i.alignment + S.bias + i.preflopBonus);
}

/**
 * Minimum scores for correct lines. Matching the best action never grades
 * below the floor even when the spot is losing; folding trash and raising
 * premiums preflop have their own higher floors.
 */
export function applyScoreFloors(
  score: number,
  heroAction: PlayerAction,
  bestAction: CoachAction,
  profile: PreflopProfile | null,
): number {
  const F = T.floors;
  if (matchesBest(heroAction, bestAction)) score = Math.max(score, F.matchedBest);
  if (profile) {
    if (heroAction === "FOLD" && profile.tier === "trash") score = Math.max(score, F.foldTrash);
    if (heroAction === "RAISE" && (profile.tier === "strong" || profile.tier === "premium")) {
      score = Math.max(score, profile.tier === "premium" ? F.raisePremium : F.raiseStrong);
    }
  }
  return score;
}

export function verdictForScore(score: number): CoachVerdict {
  const row = T.verdicts.find(v => score >= v.minScore) ?? T.verdicts[T.verdicts.length - 1];
  return row.verdict;
}
