import { describe, expect, it } from "vitest";
import { computeOutsInfo, displayDrawLabel, gradeOutsGuess, outsExplanation, ruleOfFourTwo } from "@/domain/outs";
import { cards, hand } from "../helpers";

describe("computeOutsInfo", () => {
  it("counts a flush draw as 9 outs with rule-of-4 equity on the flop", () => {
    expect(computeOutsInfo(hand("Ah 7h"), cards("2h 9h Kc"), "FLOP")).toEqual({
      correctOuts: 9, equityApproxPct: 36, drawLabel: "Flush draw",
    });
  });

  it("uses rule-of-2 on the turn", () => {
    expect(computeOutsInfo(hand("Ah 7h"), cards("2h 9h Kc 3s"), "TURN")).toMatchObject({ correctOuts: 9, equityApproxPct: 18 });
  });

  it("counts an open-ender as 8 and a gutshot as 4", () => {
    expect(computeOutsInfo(hand("8c 9d"), cards("6h 7s Kc"), "FLOP")).toMatchObject({ correctOuts: 8, drawLabel: "Open-ended straight draw" });
    expect(computeOutsInfo(hand("8c 9d"), cards("5h 7s Kc"), "FLOP")).toMatchObject({ correctOuts: 4, drawLabel: "Gutshot straight draw" });
  });

  it("combines flush and straight draws minus the configured overlap", () => {
    expect(computeOutsInfo(hand("8h 9h"), cards("6h 7h Kc"), "FLOP")).toMatchObject({ correctOuts: 16, drawLabel: "Combo draw (flush + straight)" });
  });

  it("counts set, trips and two-pair outs when there is no draw", () => {
    expect(computeOutsInfo(hand("5c 5d"), cards("2h 9s Kc"), "FLOP")).toMatchObject({ correctOuts: 2, drawLabel: "Set draw" });
    // Top pair counts the two trips outs plus the three kicker cards that make two pair.
    expect(computeOutsInfo(hand("Kd 4c"), cards("Kh 9s 2c"), "FLOP")).toMatchObject({ correctOuts: 5, drawLabel: "Trips draw" });
    expect(computeOutsInfo(hand("Ad 4c"), cards("9h 9s 2c"), "FLOP")).toMatchObject({ correctOuts: 6, drawLabel: "Two pair / full house outs" });
  });

  it("returns null with nothing to draw to", () => {
    expect(computeOutsInfo(hand("Ad Kc"), cards("2h 7s 9c"), "FLOP")).toBeNull();
  });

  it("returns null preflop and on the river, where no cards are to come", () => {
    expect(computeOutsInfo(hand("Ah 7h"), [], "PREFLOP")).toBeNull();
    // Regression: the river used to produce outs and a rule-of-2 equity.
    expect(computeOutsInfo(hand("Ah 7h"), cards("2h 9h Kc 3s 4d"), "RIVER")).toBeNull();
  });
});

describe("quiz helpers", () => {
  it("caps rule-of-4/2 percentages at 100", () => {
    expect(ruleOfFourTwo(9)).toEqual({ byRiver: 36, nextCard: 18 });
    expect(ruleOfFourTwo(30)).toEqual({ byRiver: 100, nextCard: 60 });
  });

  it("grades guesses as perfect, close (within 2) or wrong", () => {
    expect(gradeOutsGuess(9, 9)).toBe("perfect");
    expect(gradeOutsGuess(7, 9)).toBe("close");
    expect(gradeOutsGuess(12, 9)).toBe("wrong");
  });

  it("explains a draw by label and falls back to the outs count", () => {
    expect(outsExplanation({ correctOuts: 9, equityApproxPct: 36, drawLabel: "Flush draw" })).toMatch(/9 cards of that suit/);
    // Regression: the combo label contains "flush" and used to get the flush explanation.
    expect(outsExplanation({ correctOuts: 16, equityApproxPct: 64, drawLabel: "Combo draw (flush + straight)" })).toMatch(/^Combo draw/);
    expect(outsExplanation({ correctOuts: 3, equityApproxPct: 12, drawLabel: "Mystery" })).toBe("Draw: 3 outs based on visible cards.");
  });

  it("shows gutshots as a plain straight draw", () => {
    expect(displayDrawLabel("Gutshot straight draw")).toBe("Straight draw");
    expect(displayDrawLabel("Flush draw")).toBe("Flush draw");
    expect(displayDrawLabel("")).toBe("");
  });
});
