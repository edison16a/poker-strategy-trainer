import { describe, expect, it } from "vitest";
import { boardCardsUpTo, boardForStreet, fullBoardCards, streetSequenceFrom } from "@/domain/board";
import { cards } from "../helpers";
import type { FullBoard } from "@/domain/types";

const [a, b, d, t, r] = cards("2c 3c 4c 5c 6c");
const full: FullBoard = { flop: [a, b, d], turn: t, river: r };

describe("streets", () => {
  it("lists the remaining streets from a starting point", () => {
    expect(streetSequenceFrom("PREFLOP")).toEqual(["PREFLOP", "FLOP", "TURN", "RIVER"]);
    expect(streetSequenceFrom("TURN")).toEqual(["TURN", "RIVER"]);
    expect(streetSequenceFrom("RIVER")).toEqual(["RIVER"]);
  });

  it("reveals the board progressively", () => {
    expect(boardForStreet(full, "PREFLOP")).toEqual({ flop: null, turn: null, river: null });
    expect(boardForStreet(full, "TURN")).toEqual({ flop: [a, b, d], turn: t, river: null });
    expect(boardCardsUpTo(full, "FLOP")).toEqual([a, b, d]);
    expect(fullBoardCards(full)).toEqual([a, b, d, t, r]);
  });
});
