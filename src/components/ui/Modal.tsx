"use client";

import type { ReactNode } from "react";
import clsx from "clsx";

/**
 * Backdrop, click-to-dismiss scrim and card used by every dialog. Each
 * modal used to repeat this markup; keeping it here means the layering and
 * dismiss behaviour stay consistent.
 */
export function Modal({
  onClose,
  cardClassName,
  children,
}: {
  onClose: () => void;
  cardClassName?: string;
  children: ReactNode;
}) {
  return (
    <div className="modal-backdrop">
      <div className="modal-scrim" onClick={onClose} />
      <div className={clsx("modal-card", cardClassName)}>{children}</div>
    </div>
  );
}
