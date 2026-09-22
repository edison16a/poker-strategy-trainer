"use client";

import type { GameMode } from "@/domain/types";
import type { ShowdownResult } from "@/domain/showdown";
import { fullBoardCards } from "@/domain/board";
import { fmt } from "@/domain/text";
import { CardView } from "./CardView";
import clsx from "clsx";
import type { ReactElement } from "react";
import { GAME_MODES } from "@/data/game-modes";
import { COPY } from "@/data/copy";

/** Final board, who takes the pot, the narrative, and every player's hand. */
export function ShowdownPanel({ result, mode }: { result: ShowdownResult; mode: GameMode }) {
  const S = COPY.showdownPanel;
  const formatName = (name: string, isHero?: boolean) => (isHero ? S.chipYou : name.replace("Opp", "Opp "));
  const finalBoard = fullBoardCards(result.finalBoard);

  const activeWinnerIds = new Set(result.activeWinners.map(w => w.id));
  const wouldWinnerIds = new Set(result.winners.map(w => w.id));
  const activeWinnerNames = result.activeWinners.map(w => formatName(w.name, w.isHero)).join(", ") || S.opponents;
  const wouldWinnerNames = result.winners.map(w => formatName(w.name, w.isHero)).join(", ");

  const outcomeClass =
    result.heroFolded ? "fold" :
    result.heroWouldResult === "win" ? "win" :
    result.heroWouldResult === "chop" ? "chop" : "lose";

  const wouldOutcome = result.heroWouldResult === "win" ? S.win : result.heroWouldResult === "chop" ? S.chop : S.lose;
  const outcomeLabel = result.heroFolded
    ? fmt(S.foldedWould, { outcome: wouldOutcome })
    : result.heroWouldResult === "win"
    ? S.youWon
    : result.heroWouldResult === "chop"
    ? S.chopLabel
    : S.youLose;

  const actionLabel =
    result.heroAction === "CALL" ? S.actionCall :
    result.heroAction === "RAISE" ? S.actionRaise : S.actionFold;

  return (
    <div className="panel showdown-panel">
      <div className="row-between">
        <div>
          <div className="label-strong">{S.title}</div>
          <div className="meta">
            {fmt(S.modeLine, { mode: GAME_MODES[mode].label, action: actionLabel })}
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
            {fmt(S.potGoesTo, { names: activeWinnerNames })}{" "}
            {wouldWinnerNames && <>{fmt(S.runoutBest, { names: wouldWinnerNames })}</>}
          </>
        ) : (
          <>{fmt(S.winner, { names: activeWinnerNames })}</>
        )}
      </div>
      <div className="runout-detail-text">{result.runoutDetail}</div>

      <div className="showdown-players">
        {result.players.map((p) => {
          const activeWinner = activeWinnerIds.has(p.id);
          const wouldWinner = wouldWinnerIds.has(p.id);
          const displayName = formatName(p.name, p.isHero);
          const chips: ReactElement[] = [];
          if (p.isHero) chips.push(<span key="hero" className="chip chip-hero">{S.chipYou}</span>);
          if (activeWinner) chips.push(<span key="active" className="chip chip-win">{S.chipTakesPot}</span>);
          else if (wouldWinner) chips.push(<span key="would" className="chip chip-ghost">{S.chipBestRunout}</span>);

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
