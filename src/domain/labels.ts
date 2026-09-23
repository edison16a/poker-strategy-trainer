import type { OpponentActionRecord } from "./types";
import type { ShowdownResult } from "./showdown";
import { fmt } from "./text";
import { COPY } from "@/data/copy";

/**
 * Seat caption for an opponent's action: "Bet $2.50", "Check", "Fold".
 * A bet or raise of size 0 reads as a check; the records no longer carry
 * those, but the guard stays so an old profile or a hand-built state
 * cannot show "Bet $0.00".
 */
export function opponentActionLabel(opp: OpponentActionRecord | undefined): string {
  if (!opp) return COPY.common.empty;
  const size = opp.sizeBb ?? 0;
  const S = COPY.seats;
  if (opp.action === "BET") return size > 0 ? fmt(S.bet, { size: size.toFixed(2) }) : S.check;
  if (opp.action === "RAISE") return size > 0 ? fmt(S.raise, { size: size.toFixed(2) }) : S.check;
  if (opp.action === "CHECK") return S.check;
  if (opp.action === "CALL") return S.call;
  if (opp.action === "FOLD") return S.fold;
  return opp.action;
}

/** Why the runout Elo moved, for the note under the showdown breakdown. */
export function runoutReason(result: Pick<ShowdownResult, "heroFolded" | "heroWouldResult">): string {
  const R = COPY.runout.reasons;
  if (!result.heroFolded) {
    return result.heroWouldResult === "win" ? R.stayedWon : result.heroWouldResult === "chop" ? R.stayedChopped : R.stayedLost;
  }
  return result.heroWouldResult === "lose" ? R.foldedSaved : R.foldedAhead;
}

/** Signed Elo delta as text: "+60", "-30". */
export function signedDelta(delta: number): string {
  return `${delta >= 0 ? "+" : ""}${delta}`;
}
