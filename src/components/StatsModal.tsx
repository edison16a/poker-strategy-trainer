"use client";

import { useState } from "react";
import clsx from "clsx";
import type { HandsPreference, PlayerProfile } from "@/lib/types";

const HAND_PREF_OPTIONS: Array<{ value: HandsPreference; label: string; desc: string }> = [
  { value: "ANY", label: "Mixed", desc: "Hands mode uses a mix of preflop, flop, turn, and river spots." },
  { value: "PREFLOP", label: "Pre-Flop", desc: "Hands only give preflop training spots." },
  { value: "OUTS", label: "Outs", desc: "Hands always start with 1-2 cards left (flop or turn) for outs practice." },
  { value: "FINAL", label: "Final", desc: "Hands always start with 0 cards left (river-only decisions)." },
];

export function StatsModal({
  open,
  onClose,
  profile,
  onCheatSetElo,
  onChangeHandsPreference,
}: {
  open: boolean;
  onClose: () => void;
  profile: PlayerProfile;
  onCheatSetElo: (elo: number) => void;
  onChangeHandsPreference: (pref: HandsPreference) => void;
}) {
  const [cheatOpen, setCheatOpen] = useState(false);
  const [cheatVal, setCheatVal] = useState("");

  if (!open) return null;

  const prefOption = HAND_PREF_OPTIONS.find(opt => opt.value === profile.preferredHands) ?? HAND_PREF_OPTIONS[0];

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

        <div className="preferred-hands">
          <div className="row-between">
            <div className="label-strong">Preferred Hands</div>
            <div className="meta">Affects Hands mode only</div>
          </div>
          <div className="mode-toggle-buttons pref-buttons" role="group" aria-label="Preferred hand types">
            {HAND_PREF_OPTIONS.map((opt, idx, arr) => (
              <button
                key={opt.value}
                className={clsx(
                  "mode-btn",
                  "pref-button",
                  idx === 0 && "first",
                  idx === arr.length - 1 && "last",
                  opt.value === profile.preferredHands && "active",
                )}
                onClick={() => onChangeHandsPreference(opt.value)}
                type="button"
              >
                {opt.label}
              </button>
            ))}
          </div>
          <div className="meta">{prefOption.desc}</div>
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
