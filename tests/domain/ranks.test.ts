import { describe, expect, it } from "vitest";
import { computeGlobalPlacement, penaltyFactorForRank, rankFromElo, rankImagePath, rankProgress, rankTopPct } from "@/domain/ranks";
import { RANK_LADDER } from "@/data/ranks";

describe("rank ladder", () => {
  it("maps Elo to tiers at the boundaries", () => {
    expect(rankFromElo(0)).toBe("Bronze");
    expect(rankFromElo(1499)).toBe("Bronze");
    expect(rankFromElo(1500)).toBe("Silver");
    expect(rankFromElo(14999)).toBe("Legendary");
    expect(rankFromElo(15000)).toBe("Champion");
    expect(rankFromElo(1_000_000)).toBe("Champion");
  });

  it("reports progress through the current tier", () => {
    const p = rankProgress(750);
    expect(p.current.name).toBe("Bronze");
    expect(p.next.name).toBe("Silver");
    expect(p.pct).toBeCloseTo(750 / 1499, 5);
  });

  it("marks the top tier as maxed out", () => {
    const p = rankProgress(20000);
    expect(p.current.name).toBe("Champion");
    expect(p.next.name).toBe("Champion");
    expect(p.pct).toBe(1);
  });

  it("exposes the per-tier data", () => {
    expect(rankImagePath("Gold")).toBe("/ranks/gold.png");
    expect(rankTopPct("Champion")).toBe("Top 0.37%");
    expect(penaltyFactorForRank("Bronze")).toBe(0.3);
    expect(penaltyFactorForRank("Champion")).toBe(1.5);
    expect(penaltyFactorForRank(undefined)).toBe(1);
  });

  it("places Champions between #1 and the bottom of the global ladder", () => {
    expect(computeGlobalPlacement(15000).globalRank).toBe(5892);
    expect(computeGlobalPlacement(21000).globalRank).toBe(1);
    expect(computeGlobalPlacement(99999).globalRank).toBe(1);
    const mid = computeGlobalPlacement(18000).globalRank;
    expect(mid).toBeGreaterThan(1);
    expect(mid).toBeLessThan(5892);
  });

  it("keeps the ladder contiguous", () => {
    for (let i = 1; i < RANK_LADDER.length; i++) {
      expect(RANK_LADDER[i].minElo).toBe(RANK_LADDER[i - 1].maxElo + 1);
    }
  });
});
