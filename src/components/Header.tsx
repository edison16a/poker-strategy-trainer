"use client";

import type { GameMode } from "@/lib/types";
import { Brain, BarChart3, SkipForward, Gamepad2 } from "lucide-react";
import clsx from "clsx";

const MODE_LABELS: Record<GameMode, string> = {
  HANDS: "Hands",
  HANDS_PLUS: "Hands+",
  GAME: "Game",
};

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
          <div className="title">Poker Strategy Trainer</div>
          <div className="subtitle">Poker Puzzles + AI Coaching + Outs Training</div>
        </div>
      </div>

      <div className="header-actions">
        <div className="mode-toggle">
          <div className="mode-toggle-shell">
            <Gamepad2 className="icon" />
            <div className="mode-toggle-buttons" role="group" aria-label="Game mode">
              {(Object.keys(MODE_LABELS) as GameMode[]).map((key, idx, arr) => (
                <button
                  key={key}
                  className={clsx("mode-btn", key === gameMode && "active", idx === 0 && "first", idx === arr.length - 1 && "last")}
                  onClick={() => onChangeMode(key)}
                  type="button"
                >
                  {MODE_LABELS[key]}
                </button>
              ))}
            </div>
          </div>
        </div>

        <button onClick={onShowStats} className="btn header-btn" title="Stats">
          <BarChart3 className="icon" />
          <span>Stats</span>
        </button>
        <button onClick={onNextHand} className="btn btn-accent header-btn" title={nextLabel}>
          <SkipForward className="icon" />
          <span>{nextLabel}</span>
        </button>
      </div>
    </div>
  );
}
