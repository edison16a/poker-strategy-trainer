import type { Card, OutsInfo, Street } from "./types";
import { rankValue } from "./cards";
import { OUTS } from "@/data/outs";

/**
 * Deterministic outs coaching for common draws.
 *
 * This is deliberately "teaching mode": it recognises the textbook draws
 * (flush, open-ender, gutshot, pairs improving) and reports the textbook
 * outs count for each. It does not enumerate the deck, so double gutshots
 * read as a single gutshot and a made straight next to an open-ender still
 * reports the draw. Those are known simplifications, not oversights.
 */

function countBy<T extends string>(arr: T[]): Record<T, number> {
  const m: Record<string, number> = {};
  for (const x of arr) m[x] = (m[x] ?? 0) + 1;
  return m as Record<T, number>;
}

/** Suit with exactly four cards among hero plus board, or null. */
function flushDrawSuit(all: Card[]): Card["s"] | null {
  const counts = countBy(all.map(c => c.s));
  for (const s of Object.keys(counts) as Card["s"][]) {
    if (counts[s] === 4) return s;
  }
  return null;
}

/** Distinct rank values ascending, with an ace also counted as 1 for the wheel. */
function ranksSortedUnique(all: Card[]): number[] {
  const vals = Array.from(new Set(all.map(c => rankValue(c.r)))).sort((a, b) => a - b);
  if (vals.includes(14)) vals.unshift(1);
  return vals;
}

/**
 * Scans every five-card window for four present ranks. A missing end card
 * means open-ended (8 outs), a missing inner card means gutshot (4 outs).
 * Open-ended wins over gutshot when both windows exist.
 */
function straightDrawOuts(all: Card[]): { outs: number; label: string } {
  const vals = ranksSortedUnique(all);
  let best = { outs: 0, label: OUTS.labels.noStraightDraw };

  for (let start = 1; start <= 10; start++) {
    const seq = [start, start + 1, start + 2, start + 3, start + 4];
    const present = seq.filter(v => vals.includes(v)).length;
    if (present === 4) {
      const missing = seq.filter(v => !vals.includes(v))[0];
      const isEndsMissing = missing === seq[0] || missing === seq[4];
      if (isEndsMissing) {
        best = { outs: Math.max(best.outs, OUTS.openEndedOuts), label: OUTS.labels.openEnded };
      } else {
        best = best.outs >= OUTS.openEndedOuts ? best : { outs: OUTS.gutshotOuts, label: OUTS.labels.gutshot };
      }
    }
  }
  return best;
}

/**
 * Outs and rule-of-4/2 equity for the hero on the flop or turn, or null
 * when there is no recognised draw (or the street has no cards to come).
 */
export function computeOutsInfo(heroHand: [Card, Card], boardCards: Card[], street: Street): OutsInfo | null {
  // Before the fix only preflop was excluded, so river spots got an outs
  // count and a rule-of-2 equity for cards that could never come. The
  // quiz panel already hid itself on the river, but the coach still
  // reported the draw and let its equity raise the estimate.
  if (street === "PREFLOP" || street === "RIVER" || boardCards.length < 3) return null;

  const all = [...heroHand, ...boardCards];
  const boardCounts = countBy(boardCards.map(c => c.r));
  const boardHasPair = Object.values(boardCounts).some(c => c >= 2);
  const heroRanks = Array.from(new Set(heroHand.map(c => c.r)));

  const flushOuts = flushDrawSuit(all) ? OUTS.flushOuts : 0;
  const straight = straightDrawOuts(all);
  const straightOuts = straight.outs;

  let label = OUTS.labels.noMajorDraw;
  let outs = 0;

  if (flushOuts && straightOuts) {
    // Some cards complete both draws. The true overlap is not enumerated;
    // a fixed conservative overlap is subtracted instead (see data/outs.json).
    outs = flushOuts + straightOuts - OUTS.comboOverlap;
    label = OUTS.labels.combo;
  } else if (flushOuts) {
    outs = flushOuts;
    label = OUTS.labels.flush;
  } else if (straightOuts) {
    outs = straightOuts;
    label = straight.label;
  } else {
    const rankCounts = countBy(all.map(c => c.r));
    const remaining = (r: Card["r"]) => Math.max(0, 4 - (rankCounts[r] ?? 0));

    let tripsOuts = 0;
    let setOuts = 0;
    let twoPairOuts = 0;

    const heroHasPair = heroHand[0].r === heroHand[1].r;
    const pairedWithBoard = heroRanks.some(r => (boardCounts[r] ?? 0) > 0);

    if (heroHasPair) {
      setOuts = remaining(heroHand[0].r);
    }

    for (const r of heroRanks) {
      const rem = remaining(r);
      if (rem <= 0) continue;

      if ((boardCounts[r] ?? 0) > 0) {
        tripsOuts += rem;
      } else if (boardHasPair || pairedWithBoard) {
        // Already paired elsewhere, so pairing this rank makes two pair or better.
        twoPairOuts += rem;
      }
    }

    outs = setOuts + tripsOuts + twoPairOuts;
    if (outs > 0) {
      if (setOuts) label = OUTS.labels.set;
      else if (tripsOuts) label = OUTS.labels.trips;
      else label = OUTS.labels.twoPair;
    } else {
      return null;
    }
  }

  const multiplier = street === "FLOP" ? OUTS.ruleOf.FLOP : OUTS.ruleOf.TURN;
  const equityApproxPct = Math.min(100, outs * multiplier);

  return {
    correctOuts: outs,
    equityApproxPct,
    drawLabel: label,
  };
}

/** Rule-of-4/2 percentages for a guessed outs count, capped at 100. */
export function ruleOfFourTwo(outs: number): { byRiver: number; nextCard: number } {
  return {
    byRiver: Math.min(100, outs * OUTS.ruleOf.FLOP),
    nextCard: Math.min(100, outs * OUTS.ruleOf.TURN),
  };
}

/** Grades an outs guess: exact, within tolerance, or wrong. */
export function gradeOutsGuess(guess: number, correct: number): "perfect" | "close" | "wrong" {
  const d = Math.abs(guess - correct);
  if (d === 0) return "perfect";
  if (d <= OUTS.closeTolerance) return "close";
  return "wrong";
}

/** Help text for a draw label, matched by substring in data order. */
export function outsExplanation(info: OutsInfo): string {
  const l = info.drawLabel.toLowerCase();
  const hit = OUTS.explanations.find(e => l.includes(e.match));
  if (hit) return hit.text;
  return OUTS.fallbackExplanation.replace("{outs}", String(info.correctOuts));
}

/** Gutshots are shown to the player as a plain "Straight draw". */
export function displayDrawLabel(label: string): string {
  if (!label) return "";
  if (label.toLowerCase().includes("gutshot")) return OUTS.labels.gutshotDisplay;
  return label;
}
