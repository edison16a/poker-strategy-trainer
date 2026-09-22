import type { Card } from "../types";
import { cardToString, rankValue } from "../cards";
import { fmt } from "../text";
import { COACH, type PreflopProfileKey, type PreflopTier } from "@/data/coach";

export type PreflopProfile = {
  tier: PreflopTier;
  strength: number;
  equityHint: number;
  label: string;
};

function profile(key: PreflopProfileKey, handStr: string): PreflopProfile {
  const row = COACH.preflopProfiles[key];
  return { tier: row.tier, strength: row.strength, equityHint: row.equityHint, label: fmt(row.label, { hand: handStr }) };
}

/**
 * Classifies a starting hand into a tier with a strength score and an
 * equity hint against a random hand. The predicates are ordered from most
 * to least specific, so a hand takes the first row it qualifies for; the
 * per-row numbers live in data/coach.json.
 */
export function preflopHandProfile(hand: [Card, Card]): PreflopProfile {
  const [c1, c2] = hand;
  const v1 = rankValue(c1.r);
  const v2 = rankValue(c2.r);
  const hi = Math.max(v1, v2);
  const lo = Math.min(v1, v2);
  const suited = c1.s === c2.s;
  const pair = v1 === v2;
  const gap = Math.abs(v1 - v2);
  const handStr = hand.map(cardToString).join(" ");

  if (pair) {
    if (hi >= 13) return profile("premiumPair", handStr);
    if (hi >= 10) return profile("highPair", handStr);
    if (hi >= 7) return profile("mediumPair", handStr);
    return profile("smallPair", handStr);
  }

  const isBroadway = hi >= 13 && lo >= 10;
  const hasAce = hi === 14;
  const suitedConnector = suited && gap === 1;
  const suitedOneGap = suited && gap === 2;

  if (isBroadway && suited) return profile("suitedBroadway", handStr);
  if (isBroadway) return profile("broadway", handStr);
  if (hasAce && suited && lo >= 9) return profile("suitedAce", handStr);
  if (hasAce && suited && lo >= 5) return profile("weakSuitedAce", handStr);
  if (hasAce && lo >= 10) return profile("bigAce", handStr);
  if (suitedConnector && hi >= 9) return profile("suitedConnector", handStr);
  if ((suitedConnector || suitedOneGap) && hi >= 8) return profile("suitedGapper", handStr);
  if (suited && lo >= 7 && gap <= 3) return profile("suitedHand", handStr);
  if (hi >= 12 && lo >= 8) return profile("playableHigh", handStr);

  return profile("trash", handStr);
}
