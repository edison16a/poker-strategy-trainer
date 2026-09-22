import { describe, expect, it } from "vitest";
import { opponentActionsForStreet } from "@/domain/opponents";
import { boardForStreet } from "@/domain/board";
import { seededRng } from "@/domain/random";
import { cards, hand } from "../helpers";
import type { FullBoard, OpponentHand } from "@/domain/types";

const [a, b, d, t, r] = cards("9h 9s 4c Kd 2h");
const full: FullBoard = { flop: [a, b, d], turn: t, river: r };
const hands: OpponentHand[] = [
  { name: "OppA", hand: hand("7c 8c") },   // high card
  { name: "OppB", hand: hand("9d Ad") },   // trips
  { name: "OppC", hand: hand("4h 4s") },   // full house
];

describe("opponentActionsForStreet", () => {
  it("everyone checks and the pot is unchanged when the aggressor does not bet", () => {
    const out = opponentActionsForStreet(hands, boardForStreet(full, "FLOP"), "FLOP", 10, () => 0.99);
    expect(out.actions.map(x => x.action)).toEqual(["CHECK", "CHECK", "CHECK"]);
    expect(out.facing).toBeNull();
    expect(out.potBb).toBe(10);
  });

  it("the strongest hand bets and every call adds to the pot", () => {
    // First roll (bet) low so the aggressor bets, then size pick, then the per-opponent rolls.
    const rolls = [0.01, 0, 0.5, 0.5];
    const rng = () => rolls.shift() ?? 0.5;
    const out = opponentActionsForStreet(hands, boardForStreet(full, "FLOP"), "FLOP", 10, rng);
    expect(out.actions[2]).toEqual({ name: "OppC", action: "BET", sizeBb: 3 }); // 10 * 0.3
    expect(out.facing).toEqual({ type: "BET", sizeBb: 3 });
    const callers = out.actions.filter(x => x.action === "CALL").length;
    // Regression: the weak-hand call used to leave the pot short.
    expect(out.potBb).toBe(10 + 3 + callers * 3);
  });

  it("labels preflop aggression as a raise", () => {
    const out = opponentActionsForStreet(hands, boardForStreet(full, "PREFLOP"), "PREFLOP", 4, seededRng(3));
    const agg = out.actions.find(x => x.action === "RAISE" || x.action === "BET");
    if (agg) expect(agg.action).toBe("RAISE");
  });

  it("is repeatable for a seed", () => {
    const view = boardForStreet(full, "TURN");
    expect(opponentActionsForStreet(hands, view, "TURN", 12, seededRng(9)))
      .toEqual(opponentActionsForStreet(hands, view, "TURN", 12, seededRng(9)));
  });
});
