"use client";

import Image from "next/image";
import clsx from "clsx";
import type { RankName } from "@/domain/types";
import { fmt } from "@/domain/text";
import { RANK_LADDER } from "@/data/ranks";
import { COPY } from "@/data/copy";
import { Modal } from "./ui/Modal";

/** The full ladder, top tier first, with the current tier highlighted. */
export function RankModal({ open, onClose, currentRank }: { open: boolean; onClose: () => void; currentRank: RankName }) {
  if (!open) return null;

  const ranksDesc = [...RANK_LADDER].reverse();

  return (
    <Modal onClose={onClose}>
      <div className="row-between">
        <div className="title-sm">{COPY.ranks.allRanks}</div>
        <button className="btn" onClick={onClose}>{COPY.common.close}</button>
      </div>

      <div className="rank-list">
        {ranksDesc.map(rank => (
          <div key={rank.name} className={clsx("rank-row", rank.name === currentRank && "current")}>
            <div className="rank-icon">
              <Image src={rank.image} alt={rank.name} fill sizes="56px" className="rank-image" />
            </div>
            <div className="rank-row-text">
              <div className="label-strong">{rank.name}</div>
              <div className="meta">{fmt(COPY.ranks.eloMin, { min: rank.minElo })}</div>
            </div>
            <div className="rank-top">{rank.topPct}</div>
          </div>
        ))}
      </div>
    </Modal>
  );
}
