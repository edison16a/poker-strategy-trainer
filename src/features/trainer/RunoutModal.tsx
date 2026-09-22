"use client";

import type { GameMode } from "@/domain/types";
import type { ShowdownResult } from "@/domain/showdown";
import { Modal } from "@/components/ui/Modal";
import { ShowdownPanel } from "@/components/ShowdownPanel";
import { COPY } from "@/data/copy";

/** Full showdown breakdown for a finished playthrough hand. */
export function RunoutModal({
  showdown,
  gameMode,
  eloNote,
  onClose,
}: {
  showdown: ShowdownResult;
  gameMode: GameMode;
  eloNote: string | null;
  onClose: () => void;
}) {
  return (
    <Modal onClose={onClose} cardClassName="modal-card-wide">
      <div className="modal-head">
        <div className="label-strong">{COPY.runout.detailsTitle}</div>
        <button className="btn ghost" onClick={onClose}>{COPY.common.close}</button>
      </div>
      <ShowdownPanel result={showdown} mode={gameMode} />
      {eloNote && <div className="runout-elo-note">{eloNote}</div>}
    </Modal>
  );
}
