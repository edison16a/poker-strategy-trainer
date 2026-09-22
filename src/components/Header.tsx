"use client";

import type { GameMode } from "@/domain/types";
import { Brain, BarChart3, SkipForward, Gamepad2 } from "lucide-react";
import clsx from "clsx";
import { GAME_MODES, GAME_MODE_ORDER } from "@/data/game-modes";
import { COPY } from "@/data/copy";

/** Title, mode toggle, stats button and the next-hand button. */
export function Header({
  onShowStats,
  onNextHand,
  nextLabel,
  gameMode,
  onChangeMode,
}: {
  onShowStats: () => void;
  onNextHand: () => void;
  nextLabel: string;
  gameMode: GameMode;
  onChangeMode: (mode: GameMode) => void;
}) {
  return (
    <div className="header">
      <div className="header-left">
        <div className="logo-mark">
          <Brain className="icon" />
        </div>
        <div>
          <div className="title">{COPY.app.title}</div>
          <div className="subtitle">{COPY.app.subtitle}</div>
        </div>
      </div>

      <div className="header-actions">
        <div className="mode-toggle">
          <div className="mode-toggle-shell">
            <Gamepad2 className="icon" />
            <div className="mode-toggle-buttons" role="group" aria-label={COPY.header.modeGroupLabel}>
              {GAME_MODE_ORDER.map((key, idx, arr) => (
                <button
                  key={key}
                  className={clsx("mode-btn", key === gameMode && "active", idx === 0 && "first", idx === arr.length - 1 && "last")}
                  onClick={() => onChangeMode(key)}
                  type="button"
                >
                  {GAME_MODES[key].label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <button onClick={onShowStats} className="btn header-btn" title={COPY.header.stats}>
          <BarChart3 className="icon" />
          <span>{COPY.header.stats}</span>
        </button>
        <button onClick={onNextHand} className="btn btn-accent header-btn" title={nextLabel}>
          <SkipForward className="icon" />
          <span>{nextLabel}</span>
        </button>
      </div>
    </div>
  );
}
