import type { Card } from "../types";
import { formatCards, rankValue } from "../cards";
import { fmt } from "../text";
import { COACH, type PreflopCondition, type PreflopProfileKey, type PreflopTier } from "@/data/coach";

export type PreflopProfile = {
  tier: PreflopTier;
  strength: number;
  equityHint: number;
  label: string;
};

/** The features of a two-card hand that the rule table conditions on. */
export type HandFeatures = { pair: boolean; suited: boolean; hi: number; lo: number; gap: number };

export function handFeatures(hand: [Card, Card]): HandFeatures {
  const v1 = rankValue(hand[0].r);
  const v2 = rankValue(hand[1].r);
  return {
    pair: v1 === v2,
    suited: hand[0].s === hand[1].s,
    hi: Math.max(v1, v2),
    lo: Math.min(v1, v2),
    gap: Math.abs(v1 - v2),
  };
}

/** True when every condition present in `when` holds for the hand. */
export function matchesCondition(f: HandFeatures, when: PreflopCondition = {}): boolean {
  if (when.pair !== undefined && f.pair !== when.pair) return false;
  if (when.suited !== undefined && f.suited !== when.suited) return false;
  if (when.minHigh !== undefined && f.hi < when.minHigh) return false;
  if (when.minLow !== undefined && f.lo < when.minLow) return false;
  if (when.maxGap !== undefined && f.gap > when.maxGap) return false;
  return true;
}

function profile(key: PreflopProfileKey, handStr: string): PreflopProfile {
  const row = COACH.preflopProfiles[key];
  return { tier: row.tier, strength: row.strength, equityHint: row.equityHint, label: fmt(row.label, { hand: handStr }) };
}

/**
 * Classifies a starting hand into a tier with a strength score and an
 * equity hint against a random hand. The rules in data/coach.json are
 * tried in order and the first match wins, so more specific rules (pairs,
 * suited broadway) sit above general ones and the last rule is the
 * catch-all. This used to be a chain of if statements with the thresholds
 * inline; the rule table expresses the same chain as data.
 */
export function preflopHandProfile(hand: [Card, Card]): PreflopProfile {
  const f = handFeatures(hand);
  const handStr = formatCards(hand);
  const rule = COACH.preflopRules.find(r => matchesCondition(f, r.when)) ?? COACH.preflopRules[COACH.preflopRules.length - 1];
  return profile(rule.profile, handStr);
}
