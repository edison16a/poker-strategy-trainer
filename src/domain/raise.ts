import { UI } from "@/data/ui";

const S = UI.raiseSlider;

/** Slider ceiling: a multiple of the bet being faced, never below the floor. */
export function maxRaiseFor(callAmount: number | null | undefined): number {
  return Math.max(S.maxFloorBb, (callAmount ?? S.fallbackCallBb) * S.maxCallMultiplier);
}

/**
 * Default slider position: a re-raise of the bet faced (capped at the
 * slider ceiling) or the base open size when nothing is faced.
 */
export function suggestedRaiseFor(callAmount: number | null | undefined): number {
  if (callAmount && callAmount > 0) {
    const suggested = Math.max(S.minBb, Number((callAmount * S.suggestedCallMultiplier).toFixed(2)));
    return Math.min(suggested, maxRaiseFor(callAmount));
  }
  return S.defaultBb;
}
