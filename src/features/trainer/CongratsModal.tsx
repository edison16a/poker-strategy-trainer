"use client";

import Image from "next/image";
import type { RankName } from "@/domain/types";
import { rankImagePath } from "@/domain/ranks";
import { Modal } from "@/components/ui/Modal";
import { COPY } from "@/data/copy";

/** Shown once when Elo crosses into a new rank. */
export function CongratsModal({ message, rank, onClose }: { message: string; rank: RankName; onClose: () => void }) {
  return (
    <Modal onClose={onClose} cardClassName="congrats-card">
      <div className="congrats-content">
        <div className="congrats-title">{COPY.congrats.title}</div>
        <div className="congrats-text">{message}</div>
        <div className="congrats-rank">
          <Image src={rankImagePath(rank)} alt={rank} width={64} height={64} />
          <div className="congrats-rank-name">{rank}</div>
        </div>
        <button className="btn" onClick={onClose}>{COPY.common.close}</button>
      </div>
    </Modal>
  );
}
