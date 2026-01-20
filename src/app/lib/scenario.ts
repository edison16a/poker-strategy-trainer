import type { Card, Street, TrainingState, OpponentAction, GameMode } from "./types";
import { makeDeck, shuffle } from "./cards";
import { computeOutsInfo } from "./outs";

function pick<T>(arr: T[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// “Realistic-enough” templates so hands feel like poker puzzles (not nonsense).

function randomPositions() {
  const heroPos = pick(["BTN","CO","HJ","UTG"] as const);
  const villainPos = pick(["BB","SB","MP"] as const);
  return { heroPos, villainPos };
}

function streetOrder(mode: GameMode): Street[] {
  if (mode === "GAME") return ["PREFLOP"];
  return ["PREFLOP", "FLOP", "TURN", "RIVER"];
}

function randRange(min: number, max: number, precision = 2) {
  const val = Math.random() * (max - min) + min;
  const factor = 10 ** precision;
  return Math.round(val * factor) / factor;
}

function getBoardUpToStreet(board: { flop: [Card,Card,Card]; turn: Card; river: Card }, street: Street): Card[] {
  if (street === "PREFLOP") return [];
  if (street === "FLOP") return [...board.flop];
  if (street === "TURN") return [...board.flop, board.turn];
  return [...board.flop, board.turn, board.river];
}

function simpleOpponentHeuristic(heroVisibleBoard: Card[], street: Street): OpponentAction {
  // intentionally dumb: more aggression later streets, sometimes bluffs
  const bluffChance = street === "FLOP" ? 0.15 : street === "TURN" ? 0.20 : street === "PREFLOP" ? 0.12 : 0.25;
  const betChance = street === "FLOP" ? 0.55 : street === "TURN" ? 0.60 : street === "PREFLOP" ? 0.5 : 0.65;
  const r = Math.random();
  if (r < bluffChance) return "BET";
  if (r < betChance) return "BET";
  return "CHECK";
}

function pickBetSizeBb(potBb: number, street: Street) {
  const multipliers = street === "FLOP"
    ? [0.25, 0.33, 0.5, 0.66, 0.9]
    : street === "PREFLOP"
    ? [1.6, 2.2, 2.8, 3.5, 4.2]
    : [0.4, 0.6, 0.8, 1.1];

  const raw = potBb * pick(multipliers);
  return Math.max(1, Math.round(raw * 100) / 100);
}

export function generateTrainingSpot(mode: GameMode = "HANDS"): TrainingState {
  const deck = shuffle(makeDeck());

  const heroHand: [Card, Card] = [deck.pop()!, deck.pop()!];

  // Opponent hole cards exist, but we don't show them (you can reveal at “showdown” later)
  const opps = [
    [deck.pop()!, deck.pop()!],
    [deck.pop()!, deck.pop()!],
    [deck.pop()!, deck.pop()!],
  ] as [Card, Card][];

  const flop: [Card, Card, Card] = [deck.pop()!, deck.pop()!, deck.pop()!];
  const turn: Card = deck.pop()!;
  const river: Card = deck.pop()!;

  const boardAll = { flop, turn, river };
  const street = pick(streetOrder(mode));
  const boardUpTo = getBoardUpToStreet(boardAll, street);

  const { heroPos, villainPos } = randomPositions();
  const effectiveStackBb = 100;

  // Opponent actions: 3 opponents do something. One “primary” villain will often bet, but sometimes all check.
  const oppNames = ["OppA","OppB","OppC"] as const;

  let opponentActions: TrainingState["opponentActions"] = oppNames.map((name) => {
    const act = simpleOpponentHeuristic(boardUpTo, street);
    if (act === "BET") {
      return { name, action: act, sizeBb: 0 };
    }
    return { name, action: act };
  }) as TrainingState["opponentActions"];

  const primary = pick([0,1,2]);
  const shouldBet = Math.random() < 0.7; // 70% have a facing bet, otherwise all check to hero

  // Randomize preflop pots a bit (single-raised to 3-bet-ish sizes)
  const basePotMin = mode === "GAME" ? 1.2 : 4.5;
  const basePotMax = mode === "GAME" ? 5 : 9.5;
  let potBb = randRange(basePotMin, basePotMax);
  let facing: { type: "BET" | "RAISE"; sizeBb: number } | null = null;

  if (shouldBet) {
    opponentActions[primary] = { name: oppNames[primary], action: street === "PREFLOP" ? "RAISE" : "BET", sizeBb: 0 };
    const betSizeBb = pickBetSizeBb(potBb, street);
    opponentActions[primary] = { ...opponentActions[primary], sizeBb: betSizeBb };
    facing = { type: street === "PREFLOP" ? "RAISE" : "BET", sizeBb: betSizeBb };
    potBb = Math.round((potBb + betSizeBb) * 10) / 10;
  } else {
    for (let i = 0; i < opponentActions.length; i++) {
      opponentActions[i] = { name: oppNames[i], action: "CHECK" as const };
    }
  }

  const outsInfo = computeOutsInfo(heroHand, boardUpTo, street) ?? undefined;
  const opponentHands = oppNames.map((name, idx) => ({ name, hand: opps[idx] }));

  return {
    heroHand,
    board: {
      flop: street === "PREFLOP" ? null : flop,
      turn: street === "FLOP" || street === "PREFLOP" ? null : turn,
      river: street === "RIVER" ? river : null,
    },
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

export function boardToPretty(state: TrainingState) {
  const flop = state.board.flop ? state.board.flop : null;
  const turn = state.board.turn;
  const river = state.board.river;
  const cards: Card[] = [];
  if (flop) cards.push(...flop);
  if (turn) cards.push(turn);
  if (river) cards.push(river);
  return cards;
}
