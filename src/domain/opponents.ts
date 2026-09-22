import type { BoardView, FacingBet, OpponentAction, OpponentActionRecord, OpponentHand, Street } from "./types";
import { boardCardsFromView } from "./cards";
import { evaluateHand, type HandEval } from "./hand-eval";
import { type Rng, defaultRng } from "./random";
import { SCENARIO } from "@/data/scenario";

/**
 * Scripted opponent for the single-decision generator. It does not look at
 * its cards: it bets with a street-dependent probability and checks
 * otherwise. The bluff and bet thresholds both produce a bet; the split is
 * kept in the data so a future version can treat bluffs differently.
 */
export function simpleOpponentHeuristic(street: Street, rng: Rng = defaultRng): OpponentAction {
  const { bluffChance, betChance } = SCENARIO.opponentHeuristic[street];
  const r = rng();
  if (r < bluffChance || r < betChance) return "BET";
  return "CHECK";
}

export type StreetActions = {
  actions: OpponentActionRecord[];
  facing: FacingBet | null;
  potBb: number;
};

/**
 * Opponent actions for the next street of a playthrough.
 *
 * The opponent holding the strongest made-hand category is the aggressor
 * candidate; it bets with probability `betBias + strength * weight`. When it
 * bets, the others call if they hold two pair or better (with a small skip
 * chance), otherwise they fold or call at the configured odds. When nobody
 * bets, everyone checks. The random draws happen in a fixed order (bet roll,
 * size pick, then one roll per non-aggressor) so seeded runs are repeatable.
 */
export function opponentActionsForStreet(
  opponentHands: OpponentHand[],
  boardView: BoardView,
  street: Street,
  potBb: number,
  rng: Rng = defaultRng,
): StreetActions {
  const cfg = SCENARIO.playthrough;
  const boardCards = boardCardsFromView(boardView);

  const evaluated: Array<{ idx: number; eval: HandEval }> = opponentHands.map((opp, idx) => ({
    idx,
    eval: evaluateHand([...opp.hand, ...boardCards]),
  }));

  // Stable sort keeps the lowest index among equal categories as the aggressor.
  const primary = evaluated.sort((a, b) => b.eval.scoreVector[0] - a.eval.scoreVector[0])[0]?.idx ?? 0;
  const strength = evaluated.find(e => e.idx === primary)?.eval.scoreVector[0] ?? 0;
  const shouldBet = rng() < (cfg.betBias[street] + strength * cfg.strengthBetWeight);
  const sizeMults = cfg.sizeMultipliers[street];
  const sizeBb = shouldBet
    ? Math.max(SCENARIO.minBetBb, Math.round(potBb * sizeMults[Math.floor(rng() * sizeMults.length)] * 100) / 100)
    : 0;
  let facing: FacingBet | null = null;
  let newPot = potBb;
  const aggressiveAction: OpponentAction = street === "PREFLOP" ? "RAISE" : "BET";

  const actions: OpponentActionRecord[] = opponentHands.map((opp, idx) => {
    if (shouldBet && idx === primary) {
      facing = { type: aggressiveAction as FacingBet["type"], sizeBb };
      newPot = Math.round((newPot + sizeBb) * 100) / 100;
      return { name: opp.name, action: aggressiveAction, sizeBb };
    }
    if (shouldBet) {
      const evalScore = evaluated.find(e => e.idx === idx)?.eval.scoreVector[0] ?? 0;
      if (evalScore >= cfg.callStrengthMin && rng() > cfg.callSkipChance) {
        newPot = Math.round((newPot + sizeBb) * 100) / 100;
        return { name: opp.name, action: "CALL", sizeBb };
      }
      if (rng() < cfg.foldChance) return { name: opp.name, action: "FOLD" };
      return { name: opp.name, action: "CALL", sizeBb };
    }
    return { name: opp.name, action: "CHECK" };
  });

  return { actions, facing, potBb: newPot };
}
