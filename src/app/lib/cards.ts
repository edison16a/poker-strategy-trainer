import type { Card, Rank, Suit } from "./types";

export const SUITS: Suit[] = ["s", "h", "d", "c"];
export const RANKS: Rank[] = ["2","3","4","5","6","7","8","9","10","J","Q","K","A"];

export function cardToString(c: Card) {
  return `${c.r}${c.s}`;
}

export function prettySuit(s: Suit) {
  switch (s) {
    case "s": return "♠";
    case "h": return "♥";
    case "d": return "♦";
    case "c": return "♣";
  }
}

export function isRed(s: Suit) {
  return s === "h" || s === "d";
}

export function makeDeck(): Card[] {
  const deck: Card[] = [];
  for (const s of SUITS) for (const r of RANKS) deck.push({ r, s });
  return deck;
}

export function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function rankValue(r: Rank): number {
  return RANKS.indexOf(r) + 2; // 2..14
}

export function uniqueKeyForCards(cards: Card[]) {
  return cards.map(cardToString).sort().join("-");
}
