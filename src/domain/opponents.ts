import type { BoardView, FacingBet, OpponentAction, OpponentActionRecord, OpponentHand, Street } from "./types";
import { boardCardsFromView } from "./cards";
import { evaluateHand, type HandEval } from "./hand-eval";
import { type Rng, defaultRng } from "./random";
import { roundTo } from "./math";
import { SCENARIO } from "@/data/scenario";

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
    ? Math.max(SCENARIO.minBetBb, roundTo(potBb * sizeMults[Math.floor(rng() * sizeMults.length)], 2))
    : 0;
  let facing: FacingBet | null = null;
  let newPot = potBb;
  const aggressiveAction: OpponentAction = street === "PREFLOP" ? "RAISE" : "BET";

  const actions: OpponentActionRecord[] = opponentHands.map((opp, idx) => {
    if (shouldBet && idx === primary) {
      facing = { type: aggressiveAction as FacingBet["type"], sizeBb };
      newPot = roundTo(newPot + sizeBb, 2);
      return { name: opp.name, action: aggressiveAction, sizeBb };
    }
    if (shouldBet) {
      const evalScore = evaluated.find(e => e.idx === idx)?.eval.scoreVector[0] ?? 0;
      if (evalScore >= cfg.callStrengthMin && rng() > cfg.callSkipChance) {
        newPot = roundTo(newPot + sizeBb, 2);
        return { name: opp.name, action: "CALL", sizeBb };
      }
      if (rng() < cfg.foldChance) return { name: opp.name, action: "FOLD" };
      // Before the fix this call did not add its chips to the pot, unlike
      // the strong-hand call above, so the pot understated what was in it.
      newPot = roundTo(newPot + sizeBb, 2);
      return { name: opp.name, action: "CALL", sizeBb };
    }
    return { name: opp.name, action: "CHECK" };
  });

  return { actions, facing, potBb: newPot };
}
