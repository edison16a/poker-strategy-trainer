"use client";

import type { ReactElement } from "react";
import clsx from "clsx";
import type { GameMode, TrainingState } from "@/domain/types";
import type { ShowdownResult } from "@/domain/showdown";
import { opponentActionLabel } from "@/domain/labels";
import { fmt } from "@/domain/text";
import { CardView } from "@/components/CardView";
import { COPY } from "@/data/copy";
import { HERO_SEAT_INDEX, POSITION_TIMING, UNKNOWN_POSITION_TIMING } from "@/data/positions";
import type { TurnPointer } from "./useTrainerSession";

/**
 * The row of four seat boxes under the hero's cards: three opponents and
 * the hero, ordered by position so early seats read first. In playthrough
 * modes the boxes also carry face-down hole cards that flip at showdown.
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

  const opponentBox = (idx: number): ReactElement => {
    const opp = state.opponentActions[idx];
    const label = fmt(COPY.seats.opponent, { n: idx + 1 });
    const oppName = state.opponentHands?.[idx]?.name;
    const showdownPlayer = showdown?.players.find(p => p.id === oppName);
    const oppHand = state.opponentHands?.[idx]?.hand;
    const isWinner = showdown ? showdown.activeWinners.some(w => w.id === oppName) : false;

    return (
      <div className={clsx("action-box", isWinner && "opp-winner", turnPointer === idx && "turn-active")} key={label}>
        {showHoleCards && oppHand && (
          <div className="opp-showdown">
            <div className="opp-showdown-cards">
              <CardView card={oppHand[0]} small hidden={!showdown} animateFlip />
              <CardView card={oppHand[1]} small hidden={!showdown} animateFlip />
            </div>
            {showdownPlayer && <div className="opp-hand-note">{showdownPlayer.evaluation.label}</div>}
          </div>
        )}
        <div className="label">
          {isWinner ? <span className="winner-flag">{fmt(COPY.seats.opponentWon, { label })}</span> : label}
        </div>
        <div className="muted-strong">{opponentActionLabel(opp)}</div>
      </div>
    );
  };

  const heroIsWinner = showdown ? showdown.activeWinners.some(w => w.isHero) : false;
  const heroBox = (
    <div className={clsx("action-box self", heroIsWinner && "opp-winner", turnPointer === -1 && "turn-active")} key="you">
      <div className="opp-showdown">
        <div className="opp-showdown-cards">
          {showHoleCards && (
            <>
              <CardView card={state.heroHand[0]} small hidden={!showdown} animateFlip />
              <CardView card={state.heroHand[1]} small hidden={!showdown} animateFlip />
            </>
          )}
        </div>
        {showdown && (
          <div className="opp-hand-note">
            {showdown.players.find(p => p.isHero)?.evaluation.label}
          </div>
        )}
      </div>
      <div className="label">
        {heroIsWinner ? <span className="winner-flag">{COPY.seats.youWon}</span> : COPY.seats.you}
      </div>
      <div className="muted-strong">{POSITION_TIMING[state.heroPos] ?? UNKNOWN_POSITION_TIMING}</div>
    </div>
  );

  const seats = [opponentBox(0), opponentBox(1), opponentBox(2)];
  seats.splice(HERO_SEAT_INDEX[state.heroPos] ?? seats.length, 0, heroBox);

  return <div className="action-row">{seats}</div>;
}
