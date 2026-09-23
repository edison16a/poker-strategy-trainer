import type { BoardView, Card, Rank, Suit } from "./types";
import { type Rng, defaultRng, shuffle } from "./random";
import { CARD_RANKS, SUITS, SUIT_BY_CODE } from "@/data/cards";

export { CARD_RANKS, SUITS } from "@/data/cards";

export function cardToString(c: Card): string {
  return `${c.r}${c.s}`;
}

/** The glyph shown on a card face for the suit. */
export function prettySuit(s: Suit): string {
  return SUIT_BY_CODE[s].symbol;
}

export function isRed(s: Suit): boolean {
  return SUIT_BY_CODE[s].red;
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
