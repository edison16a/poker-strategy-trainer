import { describe, expect, it } from "vitest";
import { evaluateDecision, potOddsPct, preflopHandProfile, verdictForScore } from "@/domain/coach";
import { COACH } from "@/data/coach";
import { cards, flopSpot, hand, spot } from "../helpers";

describe("potOddsPct", () => {
  it("is the bet's share of the pot after calling", () => {
    expect(potOddsPct(10, 5)).toBeCloseTo(33.333, 2);
    expect(potOddsPct(10, null)).toBe(0);
    expect(potOddsPct(0, 5)).toBe(0);
  });
});

describe("preflopHandProfile", () => {
  it("tiers starting hands", () => {
    expect(preflopHandProfile(hand("As Ad")).tier).toBe("premium");
    expect(preflopHandProfile(hand("Ks Qs"))).toMatchObject({ tier: "premium", label: "Suited broadway (Ks Qs)" });
    expect(preflopHandProfile(hand("9h 8h"))).toMatchObject({ tier: "strong", label: "Suited connectors (9h 8h)" });
    expect(preflopHandProfile(hand("Ah 5h")).tier).toBe("speculative");
    expect(preflopHandProfile(hand("7c 2d"))).toMatchObject({ tier: "trash", strength: 38 });
  });
});

describe("verdictForScore", () => {
  it("maps score bands to verdicts", () => {
    expect(verdictForScore(100)).toBe("perfect");
    expect(verdictForScore(95)).toBe("perfect");
    expect(verdictForScore(94)).toBe("great");
    expect(verdictForScore(60)).toBe("good");
    expect(verdictForScore(50)).toBe("neutral");
    expect(verdictForScore(30)).toBe("not-ideal");
    expect(verdictForScore(0)).toBe("bad");
  });
});

describe("evaluateDecision", () => {
  it("wants a raise with aces preflop and grades it highly with a positive summary", () => {
    const res = evaluateDecision(spot({ heroHand: hand("As Ad"), facing: { type: "RAISE", sizeBb: 3 }, potBb: 9 }), "RAISE", 8);
    expect(res.bestAction).toBe("raise");
    expect(res.score).toBeGreaterThanOrEqual(82);
    expect(["perfect", "great"]).toContain(res.verdict);
    // Regression: perfect and great used to get the "line loses EV" summary.
    expect(res.coachSummary).toBe(COACH.copy.summaries.good);
    expect(res.conceptTags).toContain("preflop-starting-hand");
  });

  it("floors a trash fold preflop at 72 and tags discipline", () => {
    const res = evaluateDecision(spot({ heroHand: hand("7c 2d"), facing: { type: "RAISE", sizeBb: 3 }, potBb: 9 }), "FOLD");
    expect(res.bestAction).toBe("fold");
    expect(res.score).toBeGreaterThanOrEqual(72);
    expect(res.conceptTags).toContain("preflop-discipline");
    expect(res.reasons.some(r => r.startsWith("Preflop plan: Trash/ragged hand (7c 2d)"))).toBe(true);
  });

  it("never grades the recommended line below 50", () => {
    const s = flopSpot("7c 2d", "Kh 9s 4c", { facing: { type: "BET", sizeBb: 6 }, potBb: 12 });
    const res = evaluateDecision(s, "FOLD");
    expect(res.bestAction).toBe("fold");
    expect(res.score).toBeGreaterThanOrEqual(50);
    expect(evaluateDecision(s, "RAISE", 12).score).toBeLessThan(res.score);
  });

  it("recommends an open when the table checks to a strong hand", () => {
    const res = evaluateDecision(flopSpot("Kh Kd", "Ks 9s 4c"), "RAISE", 4);
    expect(res.bestAction).toBe("raise");
    expect(res.bestRaiseSizeBb).toBe(Math.max(3, Math.round(6 * 0.55)));
    expect(res.reasons.at(-1)).toMatch(/^Raising with Kh Kd vs Ks 9s 4c/);
  });

  it("uses draw equity and the rule of 4/2 on the flop", () => {
    const s = flopSpot("Ah 7h", "2h 9h Kc", {
      facing: { type: "BET", sizeBb: 3 }, potBb: 9,
      opponentActions: [{ name: "OppA", action: "BET", sizeBb: 3 }, { name: "OppB", action: "CHECK" }, { name: "OppC", action: "CHECK" }],
      outsInfo: { correctOuts: 9, equityApproxPct: 36, drawLabel: "Flush draw" },
    });
    const res = evaluateDecision(s, "CALL");
    expect(res.bestAction).toBe("call");
    expect(res.reasons).toContain("Draw outs: 9 (Flush draw) ≈ 36%.");
    expect(res.reasons.some(r => r.includes("opponents aggression: 1 bets/raises"))).toBe(true);
    // The six-reason cap drops the rule-of-4/2 line in this spot; that is existing behaviour.
    expect(res.reasons).toHaveLength(6);
    expect(res.reasons.some(r => r.startsWith("Rule of 4/2 check"))).toBe(false);
    expect(res.conceptTags).toEqual(["pot-odds+", "draws", "realize-equity"]);
  });

  it("includes the rule-of-4/2 line when nothing is faced", () => {
    const s = flopSpot("Ah 7h", "2h 9h Kc", {
      outsInfo: { correctOuts: 9, equityApproxPct: 36, drawLabel: "Flush draw" },
    });
    const res = evaluateDecision(s, "CALL");
    expect(res.reasons.some(r => r.startsWith("With no bet to face, your draw equity (~36%)"))).toBe(true);
    expect(res.reasons.length).toBeLessThanOrEqual(6);
  });

  it("describes the street in the hand line", () => {
    const [f1, f2, f3, t, r] = cards("2h 9h Kc 3s 4d");
    const river = spot({ heroHand: hand("Kd Qc"), board: { flop: [f1, f2, f3], turn: t, river: r }, street: "RIVER" });
    expect(evaluateDecision(river, "CALL").reasons[0]).toContain("(showdown card already dealt)");
    expect(evaluateDecision(spot(), "CALL").reasons[0]).toContain("(3 streets to come)");
  });
});
