"use client";

import type { PlayerAction } from "@/lib/types";
import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";

export function ActionBar({
  disabled,
  callAmount,
  onAction,
}: {
  disabled?: boolean;
  callAmount?: number | null;
  onAction: (a: PlayerAction, raiseSizeBb?: number) => void;
}) {
  const [raiseSize, setRaiseSize] = useState<number>(3);

  const minRaise = 1;
  const maxRaise = useMemo(() => Math.max(10, (callAmount ?? 5) * 4), [callAmount]);

  useEffect(() => {
    if (callAmount && callAmount > 0) {
      const suggested = Math.max(minRaise, Number((callAmount * 1.5).toFixed(2)));
      setRaiseSize(Math.min(suggested, maxRaise));
    } else {
      setRaiseSize(3);
    }
  }, [callAmount, maxRaise]);

  const callLabel = callAmount && callAmount > 0 ? `Call ($${callAmount.toFixed(2)})` : "Check";

  return (
    <div className="panel action-bar">
      <div className="action-buttons">
        <button
          disabled={disabled}
          onClick={() => onAction("FOLD")}
          className={clsx("btn", disabled && "btn-disabled")}
        >
          Fold
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
          title="Set your raise size below"
        >
          Raise (${raiseSize.toFixed(2)})
        </button>
      </div>

      <div className="raise-slider">
        <input
          type="range"
          min={minRaise}
          max={maxRaise}
          step={0.5}
          value={raiseSize}
          onChange={e => setRaiseSize(Number(e.target.value))}
          disabled={disabled}
        />
      </div>
    </div>
  );
}
