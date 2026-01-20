"use client";

import { Brain, BarChart3, SkipForward } from "lucide-react";

export function Header({
  onShowStats,
  onNextHand,
}: {
  onShowStats: () => void;
  onNextHand: () => void;
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
        <button onClick={onShowStats} className="btn header-btn" title="Stats">
          <BarChart3 className="icon" />
          <span>Stats</span>
        </button>
        <button onClick={onNextHand} className="btn btn-accent header-btn" title="Next hand">
          <SkipForward className="icon" />
          <span>Next hand</span>
        </button>
      </div>
    </div>
  );
}
