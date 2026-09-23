import { describe, expect, it } from "vitest";
import { makeDeck } from "@/domain/cards";
import { handFeatures, matchesCondition, preflopHandProfile } from "@/domain/coach/preflop";
import { COACH } from "@/data/coach";
import { hand } from "../helpers";

describe("preflop rule table", () => {
  it("classifies every two-card combination into a known profile", () => {
    const deck = makeDeck();
    const tiers = new Set<string>();
    for (let i = 0; i < deck.length; i++) for (let j = i + 1; j < deck.length; j++) {
      const p = preflopHandProfile([deck[i], deck[j]]);
      expect(["premium", "strong", "speculative", "trash"]).toContain(p.tier);
      expect(p.strength).toBeGreaterThan(0);
      tiers.add(p.tier);
    }
    expect(tiers.size).toBe(4);
  });

  it("does not depend on card order (the label keeps the order given)", () => {
    const a = preflopHandProfile(hand("Kd As"));
    const b = preflopHandProfile(hand("As Kd"));
    expect([a.tier, a.strength, a.equityHint]).toEqual([b.tier, b.strength, b.equityHint]);
    expect(a.label).toBe("Broadway combo (Kd As)");
  });

  it("ranks pairs by size and suited above offsuit", () => {
    expect(preflopHandProfile(hand("Ah Ad")).strength).toBeGreaterThan(preflopHandProfile(hand("Jh Jd")).strength);
    expect(preflopHandProfile(hand("Jh Jd")).strength).toBeGreaterThan(preflopHandProfile(hand("7h 7d")).strength);
    expect(preflopHandProfile(hand("7h 7d")).strength).toBeGreaterThan(preflopHandProfile(hand("3h 3d")).strength);
    expect(preflopHandProfile(hand("Ah Kh")).strength).toBeGreaterThan(preflopHandProfile(hand("Ah Kd")).strength);
  });

  it("ends with a catch-all rule and only references rows that exist", () => {
    const rules = COACH.preflopRules;
    expect(rules.at(-1)!.when ?? {}).toEqual({});
    for (const r of rules) expect(COACH.preflopProfiles[r.profile]).toBeDefined();
  });

  it("matches conditions field by field", () => {
    const f = handFeatures(hand("9h 8h"));
    expect(f).toEqual({ pair: false, suited: true, hi: 9, lo: 8, gap: 1 });
    expect(matchesCondition(f, { suited: true, maxGap: 1, minHigh: 9 })).toBe(true);
    expect(matchesCondition(f, { suited: true, maxGap: 1, minHigh: 10 })).toBe(false);
    expect(matchesCondition(f, { pair: true })).toBe(false);
    expect(matchesCondition(f)).toBe(true);
  });
});
