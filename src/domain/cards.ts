import type { BoardView, Card, Rank, Suit } from "./types";
import { type Rng, defaultRng, shuffle } from "./random";

export const SUITS: Suit[] = ["s", "h", "d", "c"];

/** Ascending order; the index doubles as the rank's strength (see rankValue). */
export const CARD_RANKS: Rank[] = ["2","3","4","5","6","7","8","9","10","J","Q","K","A"];

export function cardToString(c: Card): string {
  return `${c.r}${c.s}`;
}

export function prettySuit(s: Suit): string {
  switch (s) {
    case "s": return "♠";
    case "h": return "♥";
    case "d": return "♦";
    case "c": return "♣";
  }
}

export function isRed(s: Suit): boolean {
  return s === "h" || s === "d";
}

/** Unshuffled 52-card deck, suits outer, ranks inner. */
export function makeDeck(): Card[] {
  const deck: Card[] = [];
  for (const s of SUITS) for (const r of CARD_RANKS) deck.push({ r, s });
  return deck;
}

export function shuffledDeck(rng: Rng = defaultRng): Card[] {
  return shuffle(makeDeck(), rng);
}

/** Numeric strength 2..14 (ace high). */
export function rankValue(r: Rank): number {
  return CARD_RANKS.indexOf(r) + 2;
}

/** Order-independent key for a set of cards, handy for memo keys and tests. */
export function uniqueKeyForCards(cards: Card[]): string {
  return cards.map(cardToString).sort().join("-");
}

/** Community cards dealt so far, flop first, as a flat list. */
export function boardCardsFromView(view: BoardView): Card[] {
  const cards: Card[] = [];
  if (view.flop) cards.push(...view.flop);
  if (view.turn) cards.push(view.turn);
  if (view.river) cards.push(view.river);
  return cards;
}
