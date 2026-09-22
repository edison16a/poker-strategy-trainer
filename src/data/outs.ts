import raw from "./outs.json";

export type OutsExplanation = { match: string; text: string };

/**
 * Outs-trainer constants and copy.
 *
 * The outs counts are the textbook numbers the trainer teaches (9 for a
 * flush draw, 8 for an open-ender, 4 for a gutshot). `comboOverlap` is the
 * fixed number subtracted when both a flush and a straight draw are present;
 * the original code never computed the true overlap, so the constant is a
 * documented approximation rather than a derived value.
 *
 * `explanations` are matched by substring against the lowercased draw label,
 * in order; the first hit wins. `ruleOf` maps a street to its multiplier for
 * the "outs times 4 / times 2" equity estimate.
 */
export const OUTS = raw as {
  flushOuts: number;
  openEndedOuts: number;
  gutshotOuts: number;
  comboOverlap: number;
  ruleOf: { FLOP: number; TURN: number };
  closeTolerance: number;
  labels: {
    noStraightDraw: string;
    openEnded: string;
    gutshot: string;
    combo: string;
    flush: string;
    set: string;
    trips: string;
    twoPair: string;
    noMajorDraw: string;
    gutshotDisplay: string;
  };
  explanations: OutsExplanation[];
  fallbackExplanation: string;
  potOddsChart: Array<{ bet: string; need: string }>;
};
