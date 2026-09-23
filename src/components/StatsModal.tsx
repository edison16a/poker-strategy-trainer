"use client";

import { useState } from "react";
import clsx from "clsx";
import type { HandsPreference, PlayerProfile } from "@/domain/types";
import { HAND_PREFERENCE_OPTIONS, handPreferenceOption } from "@/data/game-modes";
import { COPY, STAT_CARDS } from "@/data/copy";
import { Modal } from "./ui/Modal";

/**
 * Lifetime counters, the Hands-mode preference picker, and a hidden Elo
 * setter behind the word "locally" in the footer (kept as-is; it is how
 * the author tests high ranks).
 */
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
  const S = COPY.stats;
  const [cheatOpen, setCheatOpen] = useState(false);
  const [cheatVal, setCheatVal] = useState("");

  if (!open) return null;

  const prefOption = handPreferenceOption(profile.preferredHands);

  return (
    <Modal onClose={onClose}>
      <div className="row-between">
        <div className="title-sm">{S.title}</div>
        <button onClick={onClose} className="btn">
          {COPY.common.close}
        </button>
      </div>

      <div className="stat-grid">
        {STAT_CARDS.map(card => (
          <div className="stat-card" key={card.field}>
            <div className="label">{card.label}</div>
            <div className="stat-number">{profile[card.field] ?? COPY.common.empty}</div>
          </div>
        ))}
      </div>

      <div className="preferred-hands">
        <div className="row-between">
          <div className="label-strong">{S.preferredHands}</div>
          <div className="meta">{S.preferredHandsNote}</div>
        </div>
        <div className="mode-toggle-buttons pref-buttons" role="group" aria-label={S.preferredHandsGroupLabel}>
          {HAND_PREFERENCE_OPTIONS.map((opt, idx, arr) => (
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
        {S.storedPrefix}<button className="link-button" onClick={() => setCheatOpen(true)}>{S.storedLink}</button>{S.storedSuffix}
      </div>

      {cheatOpen && (
        <div className="cheat-panel">
          <div className="row-between">
            <div className="label">{S.setElo}</div>
            <button className="info-button close" onClick={() => setCheatOpen(false)} aria-label={S.closeCheat}>×</button>
          </div>
          <div className="input-row">
            <input
              value={cheatVal}
              onChange={e => setCheatVal(e.target.value.replace(/[^\d]/g, ""))}
              className="input"
              placeholder={S.eloPlaceholder}
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
              {COPY.common.apply}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
