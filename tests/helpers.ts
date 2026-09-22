import type { Card, Rank, Suit, TrainingState } from "@/domain/types";

/** "As" -> { r: "A", s: "s" }; "10h" -> { r: "10", s: "h" }. */
export function c(code: string): Card {
  const s = code.slice(-1) as Suit;
  const r = code.slice(0, -1) as Rank;
  return { r, s };
}

export function cards(codes: string): Card[] {
  return codes.trim().split(/\s+/).map(c);
}

export function hand(codes: string): [Card, Card] {
  const [a, b] = cards(codes);
  return [a, b];
}

/** A minimal spot with sensible defaults; override what the test cares about. */
export function spot(overrides: Partial<TrainingState> = {}): TrainingState {
  return {
    heroHand: hand("As Kd"),
    board: { flop: null, turn: null, river: null },
    street: "PREFLOP",
    heroPos: "BTN",
    villainPos: "BB",
    effectiveStackBb: 100,
    potBb: 6,
    facing: null,
    opponentActions: [
      { name: "OppA", action: "CHECK" },
      { name: "OppB", action: "CHECK" },
      { name: "OppC", action: "CHECK" },
    ],
    ...overrides,
  };
}

export function flopSpot(heroCodes: string, flopCodes: string, overrides: Partial<TrainingState> = {}): TrainingState {
  const [f1, f2, f3] = cards(flopCodes);
  return spot({ heroHand: hand(heroCodes), board: { flop: [f1, f2, f3], turn: null, river: null }, street: "FLOP", ...overrides });
}
