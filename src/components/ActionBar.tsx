"use client";

import type { PlayerAction } from "@/domain/types";
import { useState } from "react";
import clsx from "clsx";
import { fmt } from "@/domain/text";
import { maxRaiseFor, suggestedRaiseFor } from "@/domain/raise";
import { COPY } from "@/data/copy";
import { UI } from "@/data/ui";

const S = UI.raiseSlider;

/** Fold, call/check and raise buttons plus the raise-size slider. */
export function ActionBar({
  disabled,
  callAmount,
  onAction,
}: {
  disabled?: boolean;
  callAmount?: number | null;
  onAction: (a: PlayerAction, raiseSizeBb?: number) => void;
}) {
  const [raiseSize, setRaiseSize] = useState<number>(() => suggestedRaiseFor(callAmount));
  const maxRaise = maxRaiseFor(callAmount);

  // Reset the slider whenever the bet being faced changes. This was an
  // effect that called setState after render; adjusting state during
  // render on a prop change is the pattern React recommends instead and
  // saves the extra render.
  const [prevCallAmount, setPrevCallAmount] = useState(callAmount);
  if (prevCallAmount !== callAmount) {
    setPrevCallAmount(callAmount);
    setRaiseSize(suggestedRaiseFor(callAmount));
  }

  const callLabel = callAmount && callAmount > 0
    ? fmt(COPY.actions.call, { amount: callAmount.toFixed(2) })
    : COPY.actions.check;

  return (
    <div className="panel action-bar">
      <div className="action-buttons">
        <button
          disabled={disabled}
          onClick={() => onAction("FOLD")}
          className={clsx("btn", disabled && "btn-disabled")}
        >
          {COPY.actions.fold}
        </button>

        <button
          disabled={disabled}
          onClick={() => onAction("CALL")}
          className={clsx("btn", disabled && "btn-disabled")}
        >
          {callLabel}
        </button>

        <button
          disabled={disabled}
          onClick={() => onAction("RAISE", raiseSize)}
          className={clsx("btn", "btn-accent", disabled && "btn-disabled")}
          title={COPY.actions.raiseTitle}
        >
          {fmt(COPY.actions.raise, { amount: raiseSize.toFixed(2) })}
        </button>
      </div>

      <div className="raise-slider">
        <input
          type="range"
          min={S.minBb}
          max={maxRaise}
          step={S.stepBb}
          value={raiseSize}
          onChange={e => setRaiseSize(Number(e.target.value))}
          disabled={disabled}
        />
      </div>
    </div>
  );
}
