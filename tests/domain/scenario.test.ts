import { describe, expect, it } from "vitest";
import { generateTrainingSpot, startingStreets } from "@/domain/scenario";
import { seededRng } from "@/domain/random";
import { cardToString } from "@/domain/cards";
import { fullBoardCards } from "@/domain/board";
import type { GameMode, HandsPreference } from "@/domain/types";

describe("startingStreets", () => {
  it("follows the preference in Hands mode and the mode elsewhere", () => {
    expect(startingStreets("HANDS", "OUTS")).toEqual(["FLOP", "TURN"]);
    expect(startingStreets("HANDS", "FINAL")).toEqual(["RIVER"]);
    expect(startingStreets("HANDS_PLUS", "FINAL")).toEqual(["PREFLOP", "FLOP", "TURN", "RIVER"]);
    expect(startingStreets("GAME", "OUTS")).toEqual(["PREFLOP"]);
  });
});

describe("generateTrainingSpot", () => {
  const modes: GameMode[] = ["HANDS", "HANDS_PLUS", "GAME"];
  const prefs: HandsPreference[] = ["ANY", "PREFLOP", "OUTS", "FINAL"];

  it("is repeatable for a seed", () => {
    expect(generateTrainingSpot("HANDS", "ANY", seededRng(7))).toEqual(generateTrainingSpot("HANDS", "ANY", seededRng(7)));
  });

  it("deals distinct cards to the hero, three opponents and the board", () => {
    for (let seed = 1; seed <= 200; seed++) {
      const s = generateTrainingSpot("HANDS_PLUS", "ANY", seededRng(seed));
      const all = [...s.heroHand, ...s.opponentHands!.flatMap(o => o.hand), ...fullBoardCards(s.fullBoard!)];
      expect(new Set(all.map(cardToString)).size).toBe(13);
    }
  });

  it("shows only the cards of the starting street", () => {
    for (let seed = 1; seed <= 200; seed++) {
      const s = generateTrainingSpot("HANDS_PLUS", "ANY", seededRng(seed));
      const visible = [s.board.flop ? 3 : 0, s.board.turn ? 1 : 0, s.board.river ? 1 : 0].reduce((a, b) => a + b);
      expect(visible).toBe({ PREFLOP: 0, FLOP: 3, TURN: 4, RIVER: 5 }[s.street]);
      if (s.street === "PREFLOP" || s.street === "RIVER") expect(s.outsInfo).toBeUndefined();
    }
  });

  it("keeps the facing bet consistent with the opponent records", () => {
    for (const mode of modes) for (const pref of prefs) for (let seed = 1; seed <= 50; seed++) {
      const s = generateTrainingSpot(mode, pref, seededRng(seed));
      const aggressors = s.opponentActions.filter(a => a.action === "BET" || a.action === "RAISE");
      if (s.facing) {
        expect(aggressors).toHaveLength(1);
        expect(aggressors[0].sizeBb).toBe(s.facing.sizeBb);
        expect(s.facing.type).toBe(s.street === "PREFLOP" ? "RAISE" : "BET");
        expect(s.facing.sizeBb).toBeGreaterThanOrEqual(1);
      } else {
        expect(aggressors).toHaveLength(0);
        expect(s.opponentActions.every(a => a.action === "CHECK")).toBe(true);
      }
      // Regression: non-aggressors used to carry zero-sized BET records.
      expect(s.opponentActions.some(a => a.action === "BET" && a.sizeBb === 0)).toBe(false);
    }
  });

  it("uses the smaller starting pot in Full Game mode", () => {
    for (let seed = 1; seed <= 100; seed++) {
      const g = generateTrainingSpot("GAME", "ANY", seededRng(seed));
      const h = generateTrainingSpot("HANDS", "PREFLOP", seededRng(seed));
      const basePot = (s: typeof g) => s.potBb - (s.facing?.sizeBb ?? 0);
      expect(basePot(g)).toBeGreaterThanOrEqual(1.2 - 0.06);
      expect(basePot(g)).toBeLessThanOrEqual(5 + 0.06);
      expect(basePot(h)).toBeGreaterThanOrEqual(4.5 - 0.06);
      expect(basePot(h)).toBeLessThanOrEqual(9.5 + 0.06);
      expect(g.street).toBe("PREFLOP");
    }
  });
});
