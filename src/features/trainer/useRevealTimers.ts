"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";

/**
 * Tracks the timeouts that drive the opponent reveal animation and the
 * delayed runout Elo so they can all be cancelled when a new hand is dealt
 * or the screen unmounts. Without this a fast "next hand" click would let
 * a stale timer mutate the new hand.
 */
export function useRevealTimers() {
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clear = useCallback(() => {
    timers.current.forEach(t => clearTimeout(t));
    timers.current = [];
  }, []);

  const schedule = useCallback((fn: () => void, delayMs: number) => {
    timers.current.push(setTimeout(fn, delayMs));
  }, []);

  useEffect(() => clear, [clear]);

  // Memoised so hooks that list the timers as a dependency keep a stable identity.
  return useMemo(() => ({ schedule, clear }), [schedule, clear]);
}
