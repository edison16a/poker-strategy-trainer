import raw from "./cards.json";
import type { Rank, Suit } from "@/domain/types";

export type SuitInfo = { code: Suit; symbol: string; red: boolean };

/**
 * The deck definition. Ranks are listed ascending; the index is the rank's
 * strength, so the order is significant. Suits carry the glyph the card
 * face shows and whether it renders in the red ink colour.
 */
export const CARD_RANKS = raw.ranks as Rank[];

export const SUIT_INFO = raw.suits as SuitInfo[];

export const SUITS: Suit[] = SUIT_INFO.map(s => s.code);

export const SUIT_BY_CODE: Record<Suit, SuitInfo> = Object.fromEntries(SUIT_INFO.map(s => [s.code, s])) as Record<Suit, SuitInfo>;
