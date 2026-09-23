"use client";

import type { GameMode, TrainingState } from "@/domain/types";
import type { ShowdownResult } from "@/domain/showdown";
import { opponentActionLabel } from "@/domain/labels";
import { fmt } from "@/domain/text";
import { COPY } from "@/data/copy";
import { HERO_SEAT_INDEX, POSITION_TIMING, UNKNOWN_POSITION_TIMING } from "@/data/positions";
import { SeatBox } from "./SeatBox";
import type { TurnPointer } from "./useTrainerSession";

/**
 * The row of four seat boxes under the hero's cards: three opponents and
 * the hero, ordered by position so early seats read first. In playthrough
 * modes the boxes also carry face-down hole cards that flip at showdown.
 * The hero's card slot is always rendered (empty in Hands mode) so the
 * box keeps its height; an opponent's slot only exists in playthrough.
 */
export function TableSeats({
  state,
  gameMode,
  showdown,
  turnPointer,
}: {
  state: TrainingState;
  gameMode: GameMode;
  showdown: ShowdownResult | null;
  turnPointer: TurnPointer;
}) {
  const showHoleCards = gameMode !== "HANDS";
  const revealed = showdown != null;

  const opponentSeat = (idx: number) => {
    const label = fmt(COPY.seats.opponent, { n: idx + 1 });
    const oppName = state.opponentHands?.[idx]?.name;
    const isWinner = showdown ? showdown.activeWinners.some(w => w.id === oppName) : false;
    return (
      <SeatBox
        key={label}
        isWinner={isWinner}
        isActive={turnPointer === idx}
        holeCards={showHoleCards ? state.opponentHands?.[idx]?.hand : undefined}
        revealed={revealed}
        handNote={showdown?.players.find(p => p.id === oppName)?.evaluation.label}
        label={isWinner ? <span className="winner-flag">{fmt(COPY.seats.opponentWon, { label })}</span> : label}
        caption={opponentActionLabel(state.opponentActions[idx])}
      />
    );
  };

  const heroIsWinner = showdown ? showdown.activeWinners.some(w => w.isHero) : false;
  const heroSeat = (
    <SeatBox
      key="you"
      isHero
      isWinner={heroIsWinner}
      isActive={turnPointer === -1}
      holeCards={showHoleCards ? state.heroHand : undefined}
      revealed={revealed}
      handNote={showdown?.players.find(p => p.isHero)?.evaluation.label}
      label={heroIsWinner ? <span className="winner-flag">{COPY.seats.youWon}</span> : COPY.seats.you}
      caption={POSITION_TIMING[state.heroPos] ?? UNKNOWN_POSITION_TIMING}
    />
  );

  const seats = [opponentSeat(0), opponentSeat(1), opponentSeat(2)];
  seats.splice(HERO_SEAT_INDEX[state.heroPos] ?? seats.length, 0, heroSeat);

  return <div className="action-row">{seats}</div>;
}
