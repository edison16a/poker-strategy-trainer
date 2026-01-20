import type { Card, Street } from "./types";
import { rankValue } from "./cards";

// Deterministic outs coaching for common draws.
// This is intentionally "teaching mode": it focuses on the most common clean outs.

function countBy<T extends string>(arr: T[]) {
  const m: Record<string, number> = {};
  for (const x of arr) m[x] = (m[x] ?? 0) + 1;
  return m as Record<T, number>;
}

function hasFlushDraw(all: Card[]) {
  const suits = all.map(c => c.s);
  const counts = countBy(suits);
  for (const s of Object.keys(counts)) {
    if ((counts as any)[s] === 4) return s as Card["s"];
  }
  return null;
}

function ranksSortedUnique(all: Card[]) {
  const vals = Array.from(new Set(all.map(c => rankValue(c.r)))).sort((a,b) => a-b);
  // A can be low in wheel
  if (vals.includes(14)) vals.unshift(1);
  return vals;
}

function straightDrawOuts(all: Card[]): { outs: number; label: string } {
  // naive but solid teaching: detect OESD (8) or gutshot (4)
  const vals = ranksSortedUnique(all);

  // check 5-length windows among possible sequences
  let best = { outs: 0, label: "No straight draw" };

  // Build candidate sequences 1..14
  for (let start = 1; start <= 10; start++) {
    const seq = [start, start+1, start+2, start+3, start+4];
    const present = seq.filter(v => vals.includes(v)).length;
    if (present === 4) {
      // missing one card in the 5-card straight
      // determine if open-ended or gutshot by checking which is missing
      const missing = seq.filter(v => !vals.includes(v))[0];
      const isEndsMissing = missing === seq[0] || missing === seq[4];
      if (isEndsMissing) {
        best = { outs: Math.max(best.outs, 8), label: "Open-ended straight draw" };
      } else {
        best = best.outs >= 8 ? best : { outs: 4, label: "Gutshot straight draw" };
      }
    }
  }
  return best;
}

export function computeOutsInfo(heroHand: [Card, Card], boardCards: Card[], street: Street) {
  // Only meaningful on flop/turn
  if (street === "PREFLOP" || boardCards.length < 3) return null;

  const all = [...heroHand, ...boardCards];
  const boardCounts = countBy(boardCards.map(c => c.r));
  const boardHasPair = Object.values(boardCounts).some(c => c >= 2);
  const heroRanks = Array.from(new Set(heroHand.map(c => c.r)));

  const flushSuit = hasFlushDraw(all);
  const flushOuts = flushSuit ? 9 : 0;
  const straight = straightDrawOuts(all);
  const straightOuts = straight.outs;

  let label = "No major draw";
  let outs = 0;

  if (flushOuts && straightOuts) {
    // combo draw; overlap is possible (some cards complete both)
    // For teaching, we approximate overlap as 0–2; we compute actual overlap deterministically:
    const needed: Card[] = [];
    // compute actual overlap by enumerating remaining cards that would improve to straight+flush
    // (simple approximation: assume 0 overlap unless board already has suited connectors)
    // We'll do a light overlap check: if both are present, subtract 1 if there exists at least one
    // card that is both in flush suit and could complete the straight pattern.
    // Keep it safe: overlap <= 2.
    // Since we don't fully compute straight completion ranks here, use a conservative overlap of 1.
    const overlap = 1;

    outs = flushOuts + straightOuts - overlap;
    label = "Combo draw (flush + straight)";
  } else if (flushOuts) {
    outs = flushOuts;
    label = "Flush draw";
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

    // Pocket pair to set
    if (heroHasPair) {
      setOuts = remaining(heroHand[0].r);
    }

    for (const r of heroRanks) {
      const rem = remaining(r);
      if (rem <= 0) continue;

      if ((boardCounts[r] ?? 0) > 0) {
        tripsOuts += rem;
      } else if (boardHasPair || pairedWithBoard) {
        // already have a pair elsewhere; pairing this rank yields two pair/full house
        twoPairOuts += rem;
      }
    }

    outs = setOuts + tripsOuts + twoPairOuts;
    if (outs > 0) {
      if (setOuts) label = "Set draw";
      else if (tripsOuts) label = "Trips draw";
      else label = "Two pair / full house outs";
    } else {
      return null;
    }
  }

  const equityApproxPct =
    street === "FLOP" ? Math.min(100, outs * 4) : Math.min(100, outs * 2);

  return {
    correctOuts: outs,
    equityApproxPct,
    drawLabel: label,
  };
}
