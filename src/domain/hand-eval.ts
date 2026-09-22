import type { Card } from "./types";
import { rankValue } from "./cards";

/** Category order; higher beats lower before kickers are compared. */
export const CATEGORY_STRENGTH = {
  HIGH_CARD: 0,
  ONE_PAIR: 1,
  TWO_PAIR: 2,
  THREE_OF_A_KIND: 3,
  STRAIGHT: 4,
  FLUSH: 5,
  FULL_HOUSE: 6,
  FOUR_OF_A_KIND: 7,
  STRAIGHT_FLUSH: 8,
} as const;

export type HandCategory = keyof typeof CATEGORY_STRENGTH;

/**
 * Result of evaluating five to seven cards.
 *
 * `scoreVector` starts with the category strength and continues with the
 * ranks that break ties within the category, most significant first. Two
 * hands compare by walking the vectors element by element, which avoids a
 * separate comparison rule per category.
 */
export type HandEval = {
  category: HandCategory;
  scoreVector: number[];
  label: string;
};

export function rankLabel(v: number): string {
  if (v === 14) return "A";
  if (v === 13) return "K";
  if (v === 12) return "Q";
  if (v === 11) return "J";
  return String(v);
}

function uniqueDesc(values: number[]): number[] {
  return Array.from(new Set(values)).sort((a, b) => b - a);
}

/**
 * Highest card of the best straight in `valuesDesc`, or null. An ace is
 * appended as a 1 so the wheel (A-2-3-4-5) is found, reported as 5-high.
 */
function findStraightHigh(valuesDesc: number[]): number | null {
  const uniq = uniqueDesc(valuesDesc);
  if (uniq[0] === 14) uniq.push(1); // wheel

  for (let i = 0; i <= uniq.length - 5; i++) {
    let runLen = 1;
    for (let j = i + 1; j < uniq.length; j++) {
      if (uniq[j] === uniq[i] - runLen) {
        runLen++;
        if (runLen >= 5) return uniq[i];
      } else if (uniq[j] !== uniq[i] - runLen + 1) {
        break;
      }
    }
  }
  return null;
}

/** Best five-card hand category and tie-break vector for the given cards. */
export function evaluateHand(cards: Card[]): HandEval {
  const values = cards.map(c => rankValue(c.r));
  const valuesDesc = values.slice().sort((a, b) => b - a);

  // Flush detection
  const suitCounts: Record<Card["s"], Card[]> = { s: [], h: [], d: [], c: [] };
  for (const c of cards) suitCounts[c.s].push(c);
  const flushSuit = (Object.entries(suitCounts).find(([, arr]) => arr.length >= 5) ?? [null, []])[0] as Card["s"] | null;
  const flushCards = flushSuit ? suitCounts[flushSuit].slice().sort((a, b) => rankValue(b.r) - rankValue(a.r)) : [];
  const flushValues = flushCards.map(c => rankValue(c.r));

  // Rank counts
  const countByRank: Record<number, number> = {};
  for (const v of values) countByRank[v] = (countByRank[v] ?? 0) + 1;

  const quads = Object.keys(countByRank).filter(k => countByRank[Number(k)] === 4).map(Number).sort((a, b) => b - a);
  const trips = Object.keys(countByRank).filter(k => countByRank[Number(k)] === 3).map(Number).sort((a, b) => b - a);
  const pairs = Object.keys(countByRank).filter(k => countByRank[Number(k)] === 2).map(Number).sort((a, b) => b - a);

  const straightFlushHigh = flushSuit ? findStraightHigh(flushValues) : null;
  if (straightFlushHigh != null) {
    return {
      category: "STRAIGHT_FLUSH",
      scoreVector: [CATEGORY_STRENGTH.STRAIGHT_FLUSH, straightFlushHigh],
      label: `${rankLabel(straightFlushHigh)}-high straight flush`,
    };
  }

  if (quads.length) {
    const quad = quads[0];
    const kicker = uniqueDesc(valuesDesc.filter(v => v !== quad))[0];
    return {
      category: "FOUR_OF_A_KIND",
      scoreVector: [CATEGORY_STRENGTH.FOUR_OF_A_KIND, quad, kicker],
      label: `Quad ${rankLabel(quad)}${kicker ? ` with ${rankLabel(kicker)} kicker` : ""}`,
    };
  }

  if (trips.length && (pairs.length || trips.length > 1)) {
    const trip = trips[0];
    const pair = trips.length > 1 ? trips[1] : pairs[0];
    return {
      category: "FULL_HOUSE",
      scoreVector: [CATEGORY_STRENGTH.FULL_HOUSE, trip, pair],
      label: `Full house, ${rankLabel(trip)}s full of ${rankLabel(pair)}s`,
    };
  }

  if (flushSuit) {
    const topFive = flushValues.slice(0, 5);
    return {
      category: "FLUSH",
      scoreVector: [CATEGORY_STRENGTH.FLUSH, ...topFive],
      label: `${rankLabel(topFive[0])}-high flush`,
    };
  }

  const straightHigh = findStraightHigh(valuesDesc);
  if (straightHigh != null) {
    return {
      category: "STRAIGHT",
      scoreVector: [CATEGORY_STRENGTH.STRAIGHT, straightHigh],
      label: `${rankLabel(straightHigh)}-high straight`,
    };
  }

  if (trips.length) {
    const trip = trips[0];
    const kickers = uniqueDesc(valuesDesc.filter(v => v !== trip)).slice(0, 2);
    return {
      category: "THREE_OF_A_KIND",
      scoreVector: [CATEGORY_STRENGTH.THREE_OF_A_KIND, trip, ...kickers],
      label: `Trips ${rankLabel(trip)}`,
    };
  }

  if (pairs.length >= 2) {
    const [hiPair, loPair] = pairs;
    const kicker = uniqueDesc(valuesDesc.filter(v => v !== hiPair && v !== loPair))[0];
    return {
      category: "TWO_PAIR",
      scoreVector: [CATEGORY_STRENGTH.TWO_PAIR, hiPair, loPair, kicker],
      label: `Two pair, ${rankLabel(hiPair)}s and ${rankLabel(loPair)}s`,
    };
  }

  if (pairs.length === 1) {
    const pair = pairs[0];
    const kickers = uniqueDesc(valuesDesc.filter(v => v !== pair)).slice(0, 3);
    return {
      category: "ONE_PAIR",
      scoreVector: [CATEGORY_STRENGTH.ONE_PAIR, pair, ...kickers],
      label: `Pair of ${rankLabel(pair)}s`,
    };
  }

  const highCards = uniqueDesc(valuesDesc).slice(0, 5);
  return {
    category: "HIGH_CARD",
    scoreVector: [CATEGORY_STRENGTH.HIGH_CARD, ...highCards],
    label: `${rankLabel(highCards[0])}-high`,
  };
}

/** Positive when `a` beats `b`, zero on a tie. Missing vector slots count as 0. */
export function compareHands(a: HandEval, b: HandEval): number {
  const len = Math.max(a.scoreVector.length, b.scoreVector.length);
  for (let i = 0; i < len; i++) {
    const av = a.scoreVector[i] ?? 0;
    const bv = b.scoreVector[i] ?? 0;
    if (av !== bv) return av - bv;
  }
  return 0;
}

/** All entries tied for the best hand, in input order. Empty input gives []. */
export function bestHands<T extends { evaluation: HandEval }>(players: T[]): T[] {
  let best: T[] = [];
  for (const p of players) {
    if (!best.length) {
      best = [p];
      continue;
    }
    const cmp = compareHands(p.evaluation, best[0].evaluation);
    if (cmp > 0) {
      best = [p];
    } else if (cmp === 0) {
      best.push(p);
    }
  }
  return best;
}
