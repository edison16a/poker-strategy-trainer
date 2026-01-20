"use client";

import Image from "next/image";
import { RANKS, rankImagePath } from "@/lib/ranks";
import type { RankName } from "@/lib/types";
import clsx from "clsx";

export function RankModal({ open, onClose, currentRank }: { open: boolean; onClose: () => void; currentRank: RankName }) {
  if (!open) return null;

  const ranksDesc = [...RANKS].reverse();

  return (
    <div className="modal-backdrop">
      <div className="modal-scrim" onClick={onClose} />
      <div className="modal-card">
        <div className="row-between">
          <div className="title-sm">All ranks</div>
          <button className="btn" onClick={onClose}>Close</button>
        </div>

        <div className="rank-list">
          {ranksDesc.map(rank => {
            const isCurrent = rank.name === currentRank;

            const topPct =
              rank.name === "Champion" ? "Top 0.37%" :
              rank.name === "Legendary" ? "Top 1%" :
              rank.name === "Mythic" ? "Top 3%" :
              rank.name === "Diamond" ? "Top 10%" :
              rank.name === "Gold" ? "Top 25%" :
              rank.name === "Silver" ? "Top 60%" :
              "Top 100%";

            return (
              <div key={rank.name} className={clsx("rank-row", isCurrent && "current")}>
                <div className="rank-icon">
                  <Image src={rankImagePath(rank.name)} alt={rank.name} fill sizes="56px" className="rank-image" />
                </div>
                <div className="rank-row-text">
                  <div className="label-strong">{rank.name}</div>
                  <div className="meta">Elo: {rank.minElo}</div>
                </div>
                <div className="rank-top">{topPct}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
