"use client";

import type { GameMode } from "@/lib/types";
import type { ShowdownResult } from "@/lib/showdown";
import { CardView } from "./CardView";
import clsx from "clsx";
import type { ReactElement } from "react";

const MODE_COPY: Record<GameMode, string> = {
  HANDS: "Hands",
  HANDS_PLUS: "Playthrough",
  GAME: "Full Game",
};

export function ShowdownPanel({ result, mode }: { result: ShowdownResult; mode: GameMode }) {
  const formatName = (name: string, isHero?: boolean) => (isHero ? "You" : name.replace("Opp", "Opp "));
  const finalBoard = [
    ...result.finalBoard.flop,
    result.finalBoard.turn,
    result.finalBoard.river,
  ];

  const activeWinnerIds = new Set(result.activeWinners.map(w => w.id));
  const wouldWinnerIds = new Set(result.winners.map(w => w.id));
  const activeWinnerNames = result.activeWinners.map(w => formatName(w.name, w.isHero)).join(", ") || "Opponents";
  const wouldWinnerNames = result.winners.map(w => formatName(w.name, w.isHero)).join(", ");

  const outcomeClass =
    result.heroFolded ? "fold" :
    result.heroWouldResult === "win" ? "win" :
    result.heroWouldResult === "chop" ? "chop" : "lose";

  const outcomeLabel = result.heroFolded
    ? `Folded · would ${result.heroWouldResult === "win" ? "win" : result.heroWouldResult === "chop" ? "chop" : "lose"}`
    : result.heroWouldResult === "win"
    ? "You Won!"
    : result.heroWouldResult === "chop"
    ? "Chop"
    : "You lose";

  const actionLabel =
    result.heroAction === "CALL" ? "Call" :
    result.heroAction === "RAISE" ? "Raise" : "Fold";

  return (
    <div className="panel showdown-panel">
      <div className="row-between">
        <div>
          <div className="label-strong">Runout</div>
          <div className="meta">
            {MODE_COPY[mode]} mode · Your action: {actionLabel}
          </div>
        </div>
        <div className={clsx("result-pill", outcomeClass)}>{outcomeLabel}</div>
      </div>
      <div className="meta">{result.runoutNote}</div>

      <div className="showdown-board">
        {finalBoard.map((card, idx) => (
          <CardView key={idx} card={card} small />
        ))}
      </div>

      <div className="muted-strong">
        {result.heroFolded ? (
          <>
            Pot goes to {activeWinnerNames}.{" "}
            {wouldWinnerNames && <>Runout best: {wouldWinnerNames}.</>}
          </>
        ) : (
          <>Winner: {activeWinnerNames}</>
        )}
      </div>
      <div className="runout-detail-text">{result.runoutDetail}</div>

      <div className="showdown-players">
        {result.players.map((p) => {
          const activeWinner = activeWinnerIds.has(p.id);
          const wouldWinner = wouldWinnerIds.has(p.id);
          const displayName = formatName(p.name, p.isHero);
          const chips: ReactElement[] = [];
          if (p.isHero) chips.push(<span key="hero" className="chip chip-hero">You</span>);
          if (activeWinner) chips.push(<span key="active" className="chip chip-win">Takes pot</span>);
          else if (wouldWinner) chips.push(<span key="would" className="chip chip-ghost">Best runout</span>);

          return (
            <div key={p.id} className={clsx("showdown-player", p.isHero && "hero", activeWinner && "winner")}>
              <div className="row-between">
                <div className="label-strong">{displayName}</div>
                {chips.length > 0 && <div className="chip-row">{chips}</div>}
              </div>
              <div className="showdown-hand">
                <CardView card={p.hand[0]} small />
                <CardView card={p.hand[1]} small />
              </div>
              <div className="meta">{p.evaluation.label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
