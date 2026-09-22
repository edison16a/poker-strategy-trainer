import { describe, expect, it } from "vitest";
import { formatDisplayName, resolveShowdown } from "@/domain/showdown";
import { cards, hand } from "../helpers";
import type { FullBoard } from "@/domain/types";

const [a, b, d, t, r] = cards("9h 9s 4c Kd 2h");
const board: FullBoard = { flop: [a, b, d], turn: t, river: r };
const decisionBoard = { flop: [a, b, d] as [typeof a, typeof b, typeof d], turn: null, river: null };
const opponents = [
  { name: "OppA", hand: hand("7c 8c") },
  { name: "OppB", hand: hand("Ad Qd") },
  { name: "OppC", hand: hand("4h 4s") },
];

describe("resolveShowdown", () => {
  it("names the winner and notes the hero was behind", () => {
    const res = resolveShowdown({ heroHand: hand("Kc Qc"), opponents, board, heroFolded: false, heroAction: "CALL", decisionBoard });
    expect(res.winners.map(w => w.id)).toEqual(["OppC"]);
    expect(res.activeWinners.map(w => w.id)).toEqual(["OppC"]);
    expect(res.heroWouldResult).toBe("lose");
    expect(res.heroAheadAtDecision).toBe(false);
    expect(res.runoutNote).toBe("Was behind at decision; consider if a tighter line was better.");
  });

  it("excludes a folded hero from the active winners but still says what would have happened", () => {
    const res = resolveShowdown({ heroHand: hand("9c 9d"), opponents, board, heroFolded: true, heroAction: "FOLD", decisionBoard });
    expect(res.winners.map(w => w.id)).toEqual(["hero"]);
    expect(res.activeWinners.map(w => w.id)).toEqual(["OppC"]);
    expect(res.heroWouldResult).toBe("win");
    expect(res.runoutNote).toMatch(/^You folded while ahead/);
    expect(res.runoutDetail).toMatch(/You folded; final board 9h 9s 4c Kd 2h\.$/);
  });

  it("reports a chop when hands tie", () => {
    const tied = [{ name: "OppA", hand: hand("Ac Qs") }, { name: "OppB", hand: hand("7c 8c") }, { name: "OppC", hand: hand("6h 3s") }];
    const res = resolveShowdown({ heroHand: hand("Ad Qc"), opponents: tied, board, heroFolded: false, heroAction: "CALL", decisionBoard });
    expect(res.heroWouldResult).toBe("chop");
    expect(res.winners.map(w => w.id)).toEqual(["hero", "OppA"]);
  });

  it("uses display names consistently in the runout text", () => {
    // Hero has top pair on the flop but an opponent rivers a set.
    const boardSet: FullBoard = { flop: cards("Kh 7s 2c") as [typeof a, typeof b, typeof d], turn: cards("9d")[0], river: cards("7d")[0] };
    const opps = [{ name: "OppA", hand: hand("7c 8c") }, { name: "OppB", hand: hand("3d 4d") }, { name: "OppC", hand: hand("5h 6s") }];
    const res = resolveShowdown({
      heroHand: hand("Kc Qc"), opponents: opps, board: boardSet, heroFolded: false, heroAction: "CALL",
      decisionBoard: { flop: boardSet.flop, turn: null, river: null },
    });
    expect(res.heroAheadAtDecision).toBe(true);
    expect(res.heroWouldResult).toBe("lose");
    expect(res.runoutDetail).toContain("Outdrawn by Opp 1 (Trips 7)");
    expect(res.runoutDetail).not.toContain("OppA");

    // Regression: the "improved to beat" sentence used the raw record name.
    // Hero is ten high against top pair on the flop and rivers a straight.
    const straightBoard: FullBoard = { flop: boardSet.flop, turn: cards("9d")[0], river: cards("Jd")[0] };
    const improved = resolveShowdown({
      heroHand: hand("8s 10s"), opponents: [{ name: "OppA", hand: hand("Kd Qd") }, ...opps.slice(1)], board: straightBoard,
      heroFolded: false, heroAction: "CALL", decisionBoard: { flop: boardSet.flop, turn: null, river: null },
    });
    expect(improved.heroAheadAtDecision).toBe(false);
    expect(improved.heroWouldResult).toBe("win");
    expect(improved.runoutDetail).toContain("You improved to beat Opp 1 (Pair of Ks)");
  });

  it("formats display names", () => {
    expect(formatDisplayName({ name: "OppA", isHero: false })).toBe("Opp 1");
    expect(formatDisplayName({ name: "Opp 2", isHero: false })).toBe("Opp 2");
    expect(formatDisplayName({ name: "Villain", isHero: false })).toBe("Villain");
    expect(formatDisplayName({ name: "OppC", isHero: true })).toBe("You");
  });
});
