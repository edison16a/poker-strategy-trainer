"use client";

import type { TrainingState } from "@/lib/types";
import { CardView } from "./CardView";

export function Board({ state }: { state: TrainingState }) {
  const flop = state.board.flop ?? null;
  const turn = state.board.turn;
  const river = state.board.river;

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
            <CardView card={flop[0]} />
            <CardView card={flop[1]} />
            <CardView card={flop[2]} />
          </>
        ) : (
          <>
            <CardView card={null} />
            <CardView card={null} />
            <CardView card={null} />
          </>
        )}
        <CardView card={turn} />
        <CardView card={river} />
      </div>
    </div>
  );
}
