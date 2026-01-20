"use client";

import type { GameMode, TrainingState } from "@/lib/types";
import { CardView } from "./CardView";
import { cardToString } from "@/lib/cards";

export function Board({ state, gameMode }: { state: TrainingState; gameMode: GameMode }) {
  const flop = state.board.flop ?? null;
  const turn = state.board.turn;
  const river = state.board.river;
  const animateFlip = gameMode !== "HANDS";

  return (
    <div className="panel board-panel">
      <div className="row-between">
        <div>
          <div className="label">Board</div>
          <div className="title-sm">{state.street}</div>
        </div>
        <div className="text-right">
          <div className="label">Pot</div>
          <div className="title-sm">${state.potBb.toFixed(2)}</div>
        </div>
      </div>

      <div className="board-cards">
        {flop ? (
          <>
            <CardView key={`flop-0-${cardToString(flop[0])}`} card={flop[0]} animateFlip={animateFlip} />
            <CardView key={`flop-1-${cardToString(flop[1])}`} card={flop[1]} animateFlip={animateFlip} />
            <CardView key={`flop-2-${cardToString(flop[2])}`} card={flop[2]} animateFlip={animateFlip} />
          </>
        ) : (
          <>
            <CardView key="flop-empty-0" card={null} hidden animateFlip={animateFlip} />
            <CardView key="flop-empty-1" card={null} hidden animateFlip={animateFlip} />
            <CardView key="flop-empty-2" card={null} hidden animateFlip={animateFlip} />
          </>
        )}
        <CardView
          key={`turn-${turn ? cardToString(turn) : "back"}`}
          card={turn}
          hidden={!turn}
          animateFlip={animateFlip}
        />
        <CardView
          key={`river-${river ? cardToString(river) : "back"}`}
          card={river}
          hidden={!river}
          animateFlip={animateFlip}
        />
      </div>
    </div>
  );
}
