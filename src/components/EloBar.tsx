"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import clsx from "clsx";
import type { RankName } from "@/domain/types";
import { computeGlobalPlacement, rankProgress } from "@/domain/ranks";
import { fmt } from "@/domain/text";
import { COPY } from "@/data/copy";
import { UI } from "@/data/ui";

/**
 * True for a few seconds after `trigger` changes while `active`. The show
 * step happens during render (a prop-change adjustment) and only the hide
 * timer lives in an effect, which keeps the React compiler's
 * set-state-in-effect rule happy.
 */
function useFlash(trigger: unknown, active: boolean): boolean {
  const [shown, setShown] = useState(false);
  const [seenTrigger, setSeenTrigger] = useState(trigger);
  if (seenTrigger !== trigger) {
    setSeenTrigger(trigger);
    setShown(active);
  }
  useEffect(() => {
    if (!shown) return;
    const t = setTimeout(() => setShown(false), UI.eloFlashMs);
    return () => clearTimeout(t);
  }, [shown, trigger]);
  return shown;
}

/**
 * Elo, rank progress to the next tier, and (for Champions) the synthetic
 * global rank with a "moved up/down" flash when it changes.
 */
export function EloBar({ elo, eloChange, rankName }: { elo: number; eloChange?: number | null; rankName: RankName }) {
  const E = COPY.eloBar;
  const { current, next, pct } = rankProgress(elo);
  const pct100 = Math.round(pct * 100);
  const isChampion = rankName === "Champion";

  const placement = isChampion ? computeGlobalPlacement(elo) : null;
  const currentGlobal = placement?.globalRank ?? null;

  // Track the previous global rank so a change can be announced. Each branch
  // only writes when something differs, so render settles in one pass.
  const [lastGlobal, setLastGlobal] = useState<number | null>(null);
  const [prevGlobal, setPrevGlobal] = useState<number | null>(null);
  if (currentGlobal == null) {
    if (lastGlobal != null || prevGlobal != null) {
      setLastGlobal(null);
      setPrevGlobal(null);
    }
  } else if (lastGlobal == null) {
    setPrevGlobal(null);
    setLastGlobal(currentGlobal);
  } else if (currentGlobal !== lastGlobal) {
    setPrevGlobal(lastGlobal);
    setLastGlobal(currentGlobal);
  }

  const remaining = Math.max(0, next.minElo - elo);
  const remainingText =
    current.name === next.name
      ? E.topRank
      : remaining === 0
      ? fmt(E.atRank, { next: next.name })
      : fmt(E.eloTo, { remaining, next: next.name });

  const championIcons = current.name === "Champion" ? UI.championIcons : null;

  const showEloChange = useFlash(eloChange, eloChange != null);
  const globalMoved = prevGlobal != null && lastGlobal != null && prevGlobal !== lastGlobal;
  const showGlobalChange = useFlash(`${prevGlobal}-${lastGlobal}`, globalMoved);

  const shownGlobal = isChampion ? (lastGlobal ?? currentGlobal) : null;

  return (
    <div className="panel">
      <div className="row-between">
        <div>
          <div className="label">{E.elo}</div>
          <div className="title-sm elo-main">
            {elo}
            {eloChange != null && showEloChange && (
              <span
                key={`${elo}-${eloChange}`}
                className={clsx("elo-change", eloChange >= 0 ? "elo-gain" : "elo-loss")}
              >
                {eloChange >= 0 ? "+" : ""}
                {eloChange}{E.eloSuffix}
              </span>
            )}
          </div>
        </div>
        {current.name === "Champion" ? (
          <div className="text-right rank-display">
            <div className="label">{E.globalRank}</div>
            <div className="rank-big">
              {shownGlobal ? `#${shownGlobal}` : COPY.common.empty}
            </div>
            {globalMoved && showGlobalChange && (
              <div
                className={clsx(
                  "rank-global-change",
                  prevGlobal > lastGlobal ? "elo-gain" : "elo-loss",
                  "elo-change"
                )}
              >
                {prevGlobal > lastGlobal ? E.movedUp : E.movedDown}
                <strong>{Math.abs(prevGlobal - lastGlobal)}</strong>
                {E.spots}
              </div>
            )}
          </div>
        ) : (
          <div className="text-right rank-display">
            <div className="label">{COPY.ranks.rank}</div>
            <div className="rank-big">{current.name}</div>
          </div>
        )}
      </div>

      {current.name !== next.name && (
        <>
          <div className="progress-row">
            <div className="rank-icon">
              {championIcons ? (
                <div className="rank-emoji">{championIcons.current}</div>
              ) : (
                <Image src={current.image} alt={current.name} fill sizes="60px" className="rank-image" />
              )}
            </div>
            <div className="progress-track with-icons">
              <div className="progress-bar" style={{ width: `${pct100}%` }} />
            </div>
            <div className="rank-icon">
              {championIcons ? (
                <div className="rank-emoji">{championIcons.next}</div>
              ) : (
                <Image src={next.image} alt={next.name} fill sizes="60px" className="rank-image" />
              )}
            </div>
          </div>

          <div className="meta meta-center">
            {fmt(E.progress, { pct: pct100, remaining: remainingText })}
          </div>
        </>
      )}
    </div>
  );
}
