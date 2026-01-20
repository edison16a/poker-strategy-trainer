"use client";

import type { GameMode } from "@/lib/types";
import { Brain, BarChart3, SkipForward, Gamepad2 } from "lucide-react";

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
        <div className="mode-select">
          <div className="mode-select-shell">
            <Gamepad2 className="icon" />
            <select
              value={gameMode}
              onChange={(e) => onChangeMode(e.target.value as GameMode)}
              aria-label="Select game mode"
            >
              {Object.entries(MODE_LABELS).map(([key, label]) => (
                <option value={key} key={key}>
                  {label}
                </option>
              ))}
            </select>
            <span className="mode-caret">▾</span>
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
