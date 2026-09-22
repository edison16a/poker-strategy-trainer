import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { RANK_LADDER, CHAMPION_LADDER } from "@/data/ranks";
import { GAME_MODES, GAME_MODE_ORDER, HAND_PREFERENCE_OPTIONS, DEFAULT_HANDS_PREFERENCE } from "@/data/game-modes";
import { HERO_POSITIONS, VILLAIN_POSITIONS, POSITION_TIMING, HERO_SEAT_INDEX, COACH_AGGRESSION_BONUS } from "@/data/positions";
import { ELO_RULES } from "@/data/elo";
import { SCENARIO } from "@/data/scenario";
import { OUTS } from "@/data/outs";
import { COACH } from "@/data/coach";
import { COPY } from "@/data/copy";
import { UI } from "@/data/ui";
import { CATEGORY_STRENGTH } from "@/domain/hand-eval";

const STREETS = ["PREFLOP", "FLOP", "TURN", "RIVER"];
const publicDir = fileURLToPath(new URL("../../public", import.meta.url));

/** Every string leaf of an object, with its path, for copy checks. */
function stringLeaves(v: unknown, path = ""): Array<[string, string]> {
  if (typeof v === "string") return [[path, v]];
  if (Array.isArray(v)) return v.flatMap((x, i) => stringLeaves(x, `${path}[${i}]`));
  if (v && typeof v === "object") return Object.entries(v).flatMap(([k, x]) => stringLeaves(x, path ? `${path}.${k}` : k));
  return [];
}

describe("ranks.json", () => {
  it("is ascending, contiguous from 0, open-ended at the top, with images on disk", () => {
    expect(RANK_LADDER[0].minElo).toBe(0);
    expect(RANK_LADDER.at(-1)!.maxElo).toBe(Number.POSITIVE_INFINITY);
    for (let i = 1; i < RANK_LADDER.length; i++) {
      expect(RANK_LADDER[i].minElo).toBe(RANK_LADDER[i - 1].maxElo + 1);
      expect(RANK_LADDER[i].outsPenaltyFactor).toBeGreaterThanOrEqual(RANK_LADDER[i - 1].outsPenaltyFactor);
    }
    for (const tier of RANK_LADDER) {
      expect(existsSync(`${publicDir}${tier.image}`), tier.image).toBe(true);
      expect(tier.topPct).toMatch(/^Top /);
    }
    expect(CHAMPION_LADDER.minElo).toBe(RANK_LADDER.at(-1)!.minElo);
    expect(CHAMPION_LADDER.ceilingElo).toBeGreaterThan(CHAMPION_LADDER.minElo);
  });
});

describe("game-modes.json and hand-preferences.json", () => {
  it("defines every mode in the toggle order with valid streets and pots", () => {
    expect(new Set(GAME_MODE_ORDER)).toEqual(new Set(Object.keys(GAME_MODES)));
    for (const key of GAME_MODE_ORDER) {
      const m = GAME_MODES[key];
      expect(m.label).toBeTruthy();
      expect(m.nextLabel).toBeTruthy();
      if (m.startingStreets !== "preference") {
        expect(m.startingStreets.length).toBeGreaterThan(0);
        for (const s of m.startingStreets) expect(STREETS).toContain(s);
      }
      expect(m.startingPotBb.min).toBeLessThan(m.startingPotBb.max);
    }
  });

  it("has a default preference and non-empty street lists", () => {
    expect(HAND_PREFERENCE_OPTIONS.some(o => o.value === DEFAULT_HANDS_PREFERENCE)).toBe(true);
    expect(new Set(HAND_PREFERENCE_OPTIONS.map(o => o.value)).size).toBe(HAND_PREFERENCE_OPTIONS.length);
    for (const o of HAND_PREFERENCE_OPTIONS) {
      expect(o.streets.length).toBeGreaterThan(0);
      for (const s of o.streets) expect(STREETS).toContain(s);
      expect(o.label).toBeTruthy();
      expect(o.desc).toBeTruthy();
    }
  });
});

describe("positions.json", () => {
  it("covers every position in every table", () => {
    for (const p of [...HERO_POSITIONS, ...VILLAIN_POSITIONS]) expect(POSITION_TIMING[p]).toBeTruthy();
    for (const p of HERO_POSITIONS) {
      expect(HERO_SEAT_INDEX[p]).toBeGreaterThanOrEqual(0);
      expect(HERO_SEAT_INDEX[p]).toBeLessThanOrEqual(3);
      expect(typeof COACH_AGGRESSION_BONUS[p]).toBe("number");
    }
  });
});

describe("elo.json", () => {
  it("has descending score tiers reaching zero and a complete runout table", () => {
    const tiers = ELO_RULES.decisionTiers;
    for (let i = 1; i < tiers.length; i++) expect(tiers[i].minScore).toBeLessThan(tiers[i - 1].minScore);
    expect(tiers.at(-1)!.minScore).toBe(0);
    for (const k of ["win", "chop", "lose"] as const) {
      expect(typeof ELO_RULES.runout.stayedIn[k]).toBe("number");
      expect(typeof ELO_RULES.runout.folded[k]).toBe("number");
    }
    expect(ELO_RULES.outsQuiz.maxAttempts).toBeGreaterThanOrEqual(1);
    for (const row of ELO_RULES.outsQuiz.bonusByDiff) expect(row.laterAttempt).toBeLessThanOrEqual(row.firstAttempt);
  });
});

describe("scenario.json and outs.json", () => {
  it("has a table for every street", () => {
    for (const s of STREETS) {
      expect(SCENARIO.betSizeMultipliers[s as "FLOP"].length).toBeGreaterThan(0);
      expect(SCENARIO.playthrough.sizeMultipliers[s as "FLOP"].length).toBeGreaterThan(0);
      expect(typeof SCENARIO.playthrough.betBias[s as "FLOP"]).toBe("number");
    }
    expect(SCENARIO.opponentNames).toHaveLength(3);
    expect(SCENARIO.facingBetChance).toBeGreaterThan(0);
    expect(SCENARIO.facingBetChance).toBeLessThanOrEqual(1);
  });

  it("keeps the textbook outs numbers and non-empty copy", () => {
    expect(OUTS.flushOuts).toBe(9);
    expect(OUTS.openEndedOuts).toBe(8);
    expect(OUTS.gutshotOuts).toBe(4);
    expect(OUTS.comboOverlap).toBeLessThan(OUTS.gutshotOuts);
    for (const e of OUTS.explanations) {
      expect(e.match).toBe(e.match.toLowerCase());
      expect(e.text).toBeTruthy();
    }
    expect(OUTS.potOddsChart.length).toBeGreaterThan(0);
  });
});

describe("coach.json", () => {
  it("covers every hand category and orders verdicts descending", () => {
    for (const cat of Object.keys(CATEGORY_STRENGTH)) {
      expect(typeof COACH.tuning.madeHandEquity[cat as "FLUSH"]).toBe("number");
      expect(typeof COACH.tuning.heroCategoryBoost[cat as "FLUSH"]).toBe("number");
    }
    const v = COACH.tuning.verdicts;
    for (let i = 1; i < v.length; i++) expect(v[i].minScore).toBeLessThan(v[i - 1].minScore);
    expect(v.at(-1)!.minScore).toBe(0);
    for (const s of STREETS) expect(COACH.copy.futureCards[s as "FLOP"]).toBeTruthy();
    for (const row of Object.values(COACH.preflopProfiles)) {
      expect(["premium", "strong", "speculative", "trash"]).toContain(row.tier);
      expect(row.label).toContain("{hand}");
    }
  });
});

describe("copy.json and ui.json", () => {
  it("has no empty strings and balanced placeholders", () => {
    for (const [path, s] of stringLeaves(COPY)) {
      expect(s.length, path).toBeGreaterThan(0);
      expect((s.match(/\{/g) ?? []).length, path).toBe((s.match(/\}/g) ?? []).length);
    }
    expect(UI.raiseSlider.minBb).toBeLessThan(UI.raiseSlider.maxFloorBb);
    expect(UI.coachEndpoint).toMatch(/^\//);
    expect(UI.profileStorageKey).toBeTruthy();
  });
});
