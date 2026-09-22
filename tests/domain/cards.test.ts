import { describe, expect, it } from "vitest";
import { boardCardsFromView, cardToString, isRed, makeDeck, prettySuit, rankValue, shuffledDeck, uniqueKeyForCards } from "@/domain/cards";
import { seededRng } from "@/domain/random";
import { c, cards } from "../helpers";

describe("deck", () => {
  it("has 52 distinct cards", () => {
    const deck = makeDeck();
    expect(deck).toHaveLength(52);
    expect(new Set(deck.map(cardToString)).size).toBe(52);
  });

  it("shuffles into a permutation that is repeatable for a seed", () => {
    const a = shuffledDeck(seededRng(42));
    const b = shuffledDeck(seededRng(42));
    const other = shuffledDeck(seededRng(43));
    expect(a).toEqual(b);
    expect(a).not.toEqual(other);
    expect(uniqueKeyForCards(a)).toBe(uniqueKeyForCards(makeDeck()));
  });
});

describe("rank and suit helpers", () => {
  it("values ranks 2..14 with ace high", () => {
    expect(rankValue("2")).toBe(2);
    expect(rankValue("10")).toBe(10);
    expect(rankValue("A")).toBe(14);
  });

  it("knows which suits are red", () => {
    expect(isRed("h")).toBe(true);
    expect(isRed("d")).toBe(true);
    expect(isRed("s")).toBe(false);
    expect(prettySuit("c")).toBe("♣");
  });

  it("flattens a board view in deal order", () => {
    const [a, b, d, t, r] = cards("2c 3c 4c 5c 6c");
    expect(boardCardsFromView({ flop: null, turn: null, river: null })).toEqual([]);
    expect(boardCardsFromView({ flop: [a, b, d], turn: null, river: null })).toEqual([a, b, d]);
    expect(boardCardsFromView({ flop: [a, b, d], turn: t, river: r })).toEqual([a, b, d, t, r]);
    expect(cardToString(c("10h"))).toBe("10h");
  });
});
