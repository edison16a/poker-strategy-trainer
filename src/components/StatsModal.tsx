"use client";

import { useState } from "react";
import type { PlayerProfile } from "@/lib/types";

export function StatsModal({
  open,
  onClose,
  profile,
  onCheatSetElo,
}: {
  open: boolean;
  onClose: () => void;
  profile: PlayerProfile;
  onCheatSetElo: (elo: number) => void;
}) {
  const [cheatOpen, setCheatOpen] = useState(false);
  const [cheatVal, setCheatVal] = useState("");

  if (!open) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal-scrim" onClick={onClose} />
      <div className="modal-card">
        <div className="row-between">
          <div className="title-sm">Stats</div>
          <button onClick={onClose} className="btn">
            Close
          </button>
        </div>

        <div className="stat-grid">
          <div className="stat-card">
            <div className="label">Total hands</div>
            <div className="stat-number">{profile.totalHands}</div>
          </div>
          <div className="stat-card">
            <div className="label">Decisions</div>
            <div className="stat-number">{profile.totalDecisions}</div>
          </div>
          <div className="stat-card">
            <div className="label">Correct outs</div>
            <div className="stat-number">{profile.correctOutsCount}</div>
          </div>
          <div className="stat-card">
            <div className="label">Last coach score</div>
            <div className="stat-number">{profile.lastCoachScore ?? "—"}</div>
          </div>
        </div>

        <div className="meta stats-footer">
          Stored <button className="link-button" onClick={() => setCheatOpen(true)}>locally</button> in your browser (localStorage). No accounts, no backend.
        </div>

        {cheatOpen && (
          <div className="cheat-panel">
            <div className="row-between">
              <div className="label">Set Elo</div>
              <button className="info-button close" onClick={() => setCheatOpen(false)} aria-label="Close cheat">×</button>
            </div>
            <div className="input-row">
              <input
                value={cheatVal}
                onChange={e => setCheatVal(e.target.value.replace(/[^\d]/g, ""))}
                className="input"
                placeholder="Enter Elo"
                inputMode="numeric"
              />
              <button
                className="btn"
                onClick={() => {
                  const n = Number(cheatVal);
                  if (!Number.isFinite(n)) return;
                  onCheatSetElo(n);
                  setCheatOpen(false);
                  setCheatVal("");
                }}
              >
                Apply
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
