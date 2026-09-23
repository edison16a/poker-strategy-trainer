import { describe, expect, it } from "vitest";
import { opponentActionLabel, runoutReason, signedDelta } from "@/domain/labels";
import { maxRaiseFor, suggestedRaiseFor } from "@/domain/raise";
import { roundTo } from "@/domain/math";

describe("opponentActionLabel", () => {
  it("captions each action and treats a zero-sized bet as a check", () => {
    expect(opponentActionLabel({ name: "OppA", action: "BET", sizeBb: 2.5 })).toBe("Bet $2.50");
    expect(opponentActionLabel({ name: "OppA", action: "RAISE", sizeBb: 4 })).toBe("Raise $4.00");
    expect(opponentActionLabel({ name: "OppA", action: "BET", sizeBb: 0 })).toBe("Check");
    expect(opponentActionLabel({ name: "OppA", action: "CALL", sizeBb: 2 })).toBe("Call");
    expect(opponentActionLabel({ name: "OppA", action: "FOLD" })).toBe("Fold");
    expect(opponentActionLabel(undefined)).toBe("—");
  });
});

describe("runoutReason and signedDelta", () => {
  it("explains each outcome", () => {
    expect(runoutReason({ heroFolded: false, heroWouldResult: "win" })).toBe("stayed in and won");
    expect(runoutReason({ heroFolded: false, heroWouldResult: "chop" })).toBe("stayed in and chopped");
    expect(runoutReason({ heroFolded: false, heroWouldResult: "lose" })).toBe("stayed in and lost");
    expect(runoutReason({ heroFolded: true, heroWouldResult: "lose" })).toBe("folded to prevent a loss");
    expect(runoutReason({ heroFolded: true, heroWouldResult: "win" })).toBe("folded while ahead");
    expect(signedDelta(60)).toBe("+60");
    expect(signedDelta(-30)).toBe("-30");
    expect(signedDelta(0)).toBe("+0");
  });
});

describe("raise slider math", () => {
  it("scales the ceiling with the bet faced and floors it", () => {
    expect(maxRaiseFor(null)).toBe(20);
    expect(maxRaiseFor(1)).toBe(10);
    expect(maxRaiseFor(6)).toBe(24);
  });

  it("suggests a 1.5x re-raise capped at the ceiling, or the base open", () => {
    expect(suggestedRaiseFor(null)).toBe(3);
    expect(suggestedRaiseFor(0)).toBe(3);
    expect(suggestedRaiseFor(4)).toBe(6);
    expect(suggestedRaiseFor(0.5)).toBe(1);
  });
});

describe("roundTo", () => {
  it("rounds to the requested decimals", () => {
    expect(roundTo(1.005 + 2.1, 2)).toBe(3.11);
    expect(roundTo(7.25, 1)).toBe(7.3);
    expect(roundTo(0.1 + 0.2, 2)).toBe(0.3);
  });
});
