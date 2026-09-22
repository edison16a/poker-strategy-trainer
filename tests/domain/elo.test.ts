import { describe, expect, it } from "vitest";
import { applyPenaltyFactor, clampElo, eloDeltaFromScore, outsQuizBonus, randomGain, runoutEloDelta } from "@/domain/elo";
import { seededRng } from "@/domain/random";

const low = () => 0;            // smallest jitter
const high = () => 0.999999;    // largest jitter

describe("randomGain", () => {
  it("jitters within plus or minus 20% and never below 1", () => {
    expect(randomGain(100, low)).toBe(80);
    expect(randomGain(100, high)).toBe(120);
    expect(randomGain(1, low)).toBe(1);
    expect(randomGain(1, high)).toBe(3);
  });
});

describe("eloDeltaFromScore", () => {
  it("rewards by tier and applies losses as flat values", () => {
    expect(eloDeltaFromScore(100, low)).toBe(400);
    expect(eloDeltaFromScore(96, low)).toBe(340);
    expect(eloDeltaFromScore(95, low)).toBe(264);
    expect(eloDeltaFromScore(75, low)).toBe(200);
    expect(eloDeltaFromScore(55, low)).toBe(148);
    expect(eloDeltaFromScore(54)).toBe(-50);
    expect(eloDeltaFromScore(20)).toBe(-70);
    expect(eloDeltaFromScore(11)).toBe(-90);
    expect(eloDeltaFromScore(0)).toBe(-150);
  });

  it("is repeatable for a seed", () => {
    expect(eloDeltaFromScore(80, seededRng(1))).toBe(eloDeltaFromScore(80, seededRng(1)));
  });
});

describe("clamp and penalty", () => {
  it("keeps Elo a non-negative integer", () => {
    expect(clampElo(-5)).toBe(0);
    expect(clampElo(10.6)).toBe(11);
  });

  it("scales losses only", () => {
    expect(applyPenaltyFactor(-100, 0.3)).toBe(-30);
    expect(applyPenaltyFactor(100, 0.3)).toBe(100);
  });
});

describe("runoutEloDelta", () => {
  it("rewards staying in to win and folding to dodge a loss", () => {
    expect(runoutEloDelta(false, "win")).toBe(60);
    expect(runoutEloDelta(false, "chop")).toBe(20);
    expect(runoutEloDelta(false, "lose")).toBe(-60);
    expect(runoutEloDelta(true, "lose")).toBe(40);
    expect(runoutEloDelta(true, "chop")).toBe(10);
    expect(runoutEloDelta(true, "win")).toBe(-30);
  });
});

describe("outsQuizBonus", () => {
  it("pays by distance and attempt, penalises misses by rank", () => {
    expect(outsQuizBonus(9, 9, 1, 1, low)).toBe(192);   // 240 base, jittered down
    expect(outsQuizBonus(9, 9, 2, 1, low)).toBe(136);   // 170 base
    expect(outsQuizBonus(8, 9, 1, 1, low)).toBe(136);   // diff 1: 170 base
    expect(outsQuizBonus(6, 9, 1, 1, low)).toBe(48);    // diff 3: 60 base
    expect(outsQuizBonus(1, 9, 1, 0.3)).toBe(-18);      // miss: -60 * 0.3
    expect(outsQuizBonus(1, 9, 2, 1)).toBe(-120);       // second miss
  });
});
