"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { rankProgress, rankImagePath } from "@/lib/ranks";
import clsx from "clsx";
import type { RankName } from "@/lib/types";

function computeGlobalPlacement(elo: number, baseTime: number) {
  // Champion ladder: bottom rank #5892 at 6000 Elo, top rank #1 at a moving ceiling.
  const minElo = 6000;
  const startMax = 11512;

  const elapsedMs = Math.max(0, Date.now() - baseTime);
  const cycleSeconds = 25;
  const cycles = Math.floor(elapsedMs / (cycleSeconds * 1000));
  const variableStep = 20 + 5 * Math.sin(cycles * 0.7); // stays ~15–25
  const maxElo = startMax + Math.round(cycles * variableStep);

  const spread = Math.max(1, maxElo - minElo);
  const clamped = Math.min(Math.max(elo, minElo), maxElo);
  const ratio = (maxElo - clamped) / spread;
  const globalRank = Math.max(1, Math.ceil(1 + ratio * (5892 - 1)));

  return { globalRank, maxElo };
}

export function EloBar({ elo, eloChange, rankName }: { elo: number; eloChange?: number | null; rankName: RankName }) {
  const { current, next, pct } = rankProgress(elo);
  const pct100 = Math.round(pct * 100);

  // Force periodic recompute for the dynamic ladder ceiling and on Elo changes.
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 15000 + Math.round(Math.random() * 5000));
    return () => clearInterval(id);
  }, []);

  const placement = rankName === "Champion" ? computeGlobalPlacement(elo, Date.now() + tick) : null;
  const [lastGlobal, setLastGlobal] = useState<number | null>(null);
  const [prevGlobal, setPrevGlobal] = useState<number | null>(null);
  useEffect(() => {
    if (rankName !== "Champion" || placement?.globalRank == null) {
      setLastGlobal(null);
      setPrevGlobal(null);
      return;
    }

    if (lastGlobal == null) {
      setPrevGlobal(null);
      setLastGlobal(placement.globalRank);
      return;
    }

    if (placement.globalRank !== lastGlobal) {
      setPrevGlobal(lastGlobal);
      setLastGlobal(placement.globalRank);
    }
  }, [placement?.globalRank, rankName, lastGlobal]);

  const remaining =
    next.maxElo === Number.POSITIVE_INFINITY
      ? Math.max(0, next.minElo - elo)
      : Math.max(0, next.minElo - elo);

  const remainingText =
    current.name === next.name
      ? "Top rank achieved"
      : remaining === 0
      ? `At ${next.name}`
      : `${remaining} Elo to ${next.name}`;

  const leftIcon = current.name === "Champion" ? "🏅" : null;
  const rightIcon = current.name === "Champion" ? "🥇" : null;

  // Timed visibility for animations
  const [showEloChange, setShowEloChange] = useState(false);
  useEffect(() => {
    if (eloChange != null) {
      setShowEloChange(true);
      const t = setTimeout(() => setShowEloChange(false), 3000);
      return () => clearTimeout(t);
    }
  }, [eloChange]);

  const [showGlobalChange, setShowGlobalChange] = useState(false);
  useEffect(() => {
    if (prevGlobal != null && lastGlobal != null && prevGlobal !== lastGlobal) {
      setShowGlobalChange(true);
      const t = setTimeout(() => setShowGlobalChange(false), 3000);
      return () => clearTimeout(t);
    }
  }, [prevGlobal, lastGlobal]);

  const shownGlobal = rankName === "Champion" ? (lastGlobal ?? placement?.globalRank ?? null) : null;

  return (
    <div className="panel">
      <div className="row-between">
        <div>
          <div className="label">Elo</div>
          <div className="title-sm elo-main">
            {elo}
            {eloChange != null && showEloChange && (
              <span
                key={`${elo}-${eloChange}`}
                className={clsx("elo-change", eloChange >= 0 ? "elo-gain" : "elo-loss")}
              >
                {eloChange >= 0 ? "+" : ""}
                {eloChange} Elo
              </span>
            )}
          </div>
        </div>
        {current.name === "Champion" ? (
          <div className="text-right rank-display">
            <div className="label">Global rank</div>
            <div className="rank-big">
              {shownGlobal ? `#${shownGlobal}` : "—"}
            </div>
            {prevGlobal != null && lastGlobal != null && prevGlobal !== lastGlobal && showGlobalChange && (
              <div
                className={clsx(
                  "rank-global-change",
                  prevGlobal > lastGlobal ? "elo-gain" : "elo-loss",
                  "elo-change"
                )}
              >
                {prevGlobal > lastGlobal ? "Moved Up " : "Moved Down "}
                <strong>{Math.abs(prevGlobal - lastGlobal)}</strong>
                {" "}spots
              </div>
            )}
          </div>
        ) : (
          <div className="text-right rank-display">
            <div className="label">Rank</div>
            <div className="rank-big">{current.name}</div>
          </div>
        )}
      </div>

      {current.name !== next.name && (
        <>
          <div className="progress-row">
            <div className="rank-icon">
              {leftIcon ? (
                <div className="rank-emoji">{leftIcon}</div>
              ) : (
                <Image src={rankImagePath(current.name)} alt={current.name} fill sizes="60px" className="rank-image" />
              )}
            </div>
            <div className="progress-track with-icons">
              <div className="progress-bar" style={{ width: `${pct100}%` }} />
            </div>
            <div className="rank-icon">
              {rightIcon ? (
                <div className="rank-emoji">🥇</div>
              ) : (
                <Image src={rankImagePath(next.name)} alt={next.name} fill sizes="60px" className="rank-image" />
              )}
            </div>
          </div>

          <div className="meta meta-center">
            {pct100}% to next rank · {remainingText}
          </div>
        </>
      )}

    </div>
  );
}
