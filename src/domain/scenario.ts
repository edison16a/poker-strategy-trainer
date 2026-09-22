import type {
  Card, FacingBet, FullBoard, GameMode, HandsPreference, OpponentActionRecord, OpponentHand, Street, TrainingState,
} from "./types";
import { shuffledDeck } from "./cards";
import { boardCardsUpTo, boardForStreet } from "./board";
import { computeOutsInfo } from "./outs";
import { simpleOpponentHeuristic } from "./opponents";
import { type Rng, defaultRng, pick, randRange } from "./random";
import { GAME_MODES, handPreferenceOption } from "@/data/game-modes";
import { HERO_POSITIONS, VILLAIN_POSITIONS } from "@/data/positions";
import { SCENARIO } from "@/data/scenario";

/** Streets a new spot may start on for this mode and preference. */
export function startingStreets(mode: GameMode, handsPref: HandsPreference): Street[] {
  const configured = GAME_MODES[mode].startingStreets;
  return configured === "preference" ? handPreferenceOption(handsPref).streets : configured;
}

/** Bet size as a multiple of the pot, street-dependent, never below the minimum. */
function pickBetSizeBb(potBb: number, street: Street, rng: Rng): number {
  const raw = potBb * pick(SCENARIO.betSizeMultipliers[street], rng);
  return Math.max(SCENARIO.minBetBb, Math.round(raw * 100) / 100);
}

/**
 * Deals a fresh training spot.
 *
 * The whole runout and all three opponent hands are dealt now so a
 * playthrough can reveal them later without re-dealing. The order of
 * random draws (deck shuffle, street, positions, opponent rolls, aggressor,
 * bet roll, pot, bet size) is part of the contract: tests and the golden
 * comparison rely on it.
 */
export function generateTrainingSpot(
  mode: GameMode = "HANDS",
  handsPref: HandsPreference = "ANY",
  rng: Rng = defaultRng,
): TrainingState {
  const deck = shuffledDeck(rng);

  const heroHand: [Card, Card] = [deck.pop()!, deck.pop()!];

  const opps = [
    [deck.pop()!, deck.pop()!],
    [deck.pop()!, deck.pop()!],
    [deck.pop()!, deck.pop()!],
  ] as [Card, Card][];

  const flop: [Card, Card, Card] = [deck.pop()!, deck.pop()!, deck.pop()!];
  const turn: Card = deck.pop()!;
  const river: Card = deck.pop()!;

  const boardAll: FullBoard = { flop, turn, river };
  const street = pick(startingStreets(mode, handsPref), rng);
  const boardUpTo = boardCardsUpTo(boardAll, street);

  const heroPos = pick(HERO_POSITIONS, rng);
  const villainPos = pick(VILLAIN_POSITIONS, rng);
  const effectiveStackBb = SCENARIO.effectiveStackBb;

  // Three opponents each roll an action. Bets get a placeholder size of 0
  // until the aggressor is chosen below.
  const oppNames = SCENARIO.opponentNames;
  const opponentActions: OpponentActionRecord[] = oppNames.map((name) => {
    const act = simpleOpponentHeuristic(street, rng);
    if (act === "BET") {
      return { name, action: act, sizeBb: 0 };
    }
    return { name, action: act };
  });

  const primary = pick([0, 1, 2], rng);
  const shouldBet = rng() < SCENARIO.facingBetChance;

  const potRange = GAME_MODES[mode].startingPotBb;
  let potBb = randRange(potRange.min, potRange.max, 2, rng);
  let facing: FacingBet | null = null;

  if (shouldBet) {
    const type: FacingBet["type"] = street === "PREFLOP" ? "RAISE" : "BET";
    const betSizeBb = pickBetSizeBb(potBb, street, rng);
    opponentActions[primary] = { name: oppNames[primary], action: type, sizeBb: betSizeBb };
    facing = { type, sizeBb: betSizeBb };
    potBb = Math.round((potBb + betSizeBb) * 10) / 10;
  } else {
    for (let i = 0; i < opponentActions.length; i++) {
      opponentActions[i] = { name: oppNames[i], action: "CHECK" };
    }
  }

  const outsInfo = computeOutsInfo(heroHand, boardUpTo, street) ?? undefined;
  const opponentHands: OpponentHand[] = oppNames.map((name, idx) => ({ name, hand: opps[idx] }));

  return {
    heroHand,
    board: boardForStreet(boardAll, street),
    street,
    heroPos,
    villainPos,
    effectiveStackBb,
    potBb,
    facing,
    opponentActions,
    fullBoard: boardAll,
    opponentHands,
    outsInfo,
  };
}
