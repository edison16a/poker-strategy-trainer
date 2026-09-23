"use client";

import type { ReactNode } from "react";
import clsx from "clsx";
import type { Card } from "@/domain/types";
import { CardView } from "@/components/CardView";

/**
 * One seat on the table row. The hero and each opponent render the same
 * frame: optional face-down hole cards that flip at showdown, a hand note
 * once revealed, the seat label (or the winner flag) and a caption with
 * the action taken or the position. The two callers only differ in what
 * they pass, so the markup lives once here.
 */
export function SeatBox({
  isHero = false,
  isWinner,
  isActive,
  holeCards,
  revealed,
  handNote,
  label,
  caption,
}: {
  isHero?: boolean;
  isWinner: boolean;
  isActive: boolean;
  /** Undefined hides the card slot entirely (Hands mode opponents). */
  holeCards: [Card, Card] | undefined;
  revealed: boolean;
  handNote: string | undefined;
  label: ReactNode;
  caption: string;
}) {
  return (
    <div className={clsx("action-box", isHero && "self", isWinner && "opp-winner", isActive && "turn-active")}>
      {(isHero || holeCards) && (
        <div className="opp-showdown">
          <div className="opp-showdown-cards">
            {holeCards && (
              <>
                <CardView card={holeCards[0]} small hidden={!revealed} animateFlip />
                <CardView card={holeCards[1]} small hidden={!revealed} animateFlip />
              </>
            )}
          </div>
          {handNote && <div className="opp-hand-note">{handNote}</div>}
        </div>
      )}
      <div className="label">{label}</div>
      <div className="muted-strong">{caption}</div>
    </div>
  );
}
