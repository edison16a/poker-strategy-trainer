"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  BoardView, GameMode, HandsPreference, OpponentAction, OpponentActionRecord, PlayerAction, PlayerProfile, Street, TrainingState,
} from "@/domain/types";
import { generateTrainingSpot } from "@/domain/scenario";
import { boardForStreet, streetSequenceFrom } from "@/domain/board";
import { boardCardsFromView } from "@/domain/cards";
import { opponentActionsForStreet } from "@/domain/opponents";
import { computeOutsInfo } from "@/domain/outs";
import { resolveShowdown, type ShowdownResult } from "@/domain/showdown";
import { applyPenaltyFactor, eloDeltaFromScore, outsQuizBonus, runoutEloDelta } from "@/domain/elo";
import { penaltyFactorForRank } from "@/domain/ranks";
import { fmt } from "@/domain/text";
import { runoutReason, signedDelta } from "@/domain/labels";
import { DEFAULT_HANDS_PREFERENCE } from "@/data/game-modes";
import { ELO_RULES } from "@/data/elo";
import { SCENARIO } from "@/data/scenario";
import { COPY } from "@/data/copy";
import { rankUpMessage, withElo, withEloDelta } from "@/features/profile/profile-updates";
import { requestCoachFeedback } from "./coach-client";
import { useRevealTimers } from "./useRevealTimers";
import type { CoachResponse } from "@/domain/types";

export type OutsGrade = "perfect" | "close" | "wrong";

/** -1 marks the hero's turn, an index marks an opponent, null means idle. */
export type TurnPointer = number | null;

type ProfileSetter = (update: (p: PlayerProfile | null) => PlayerProfile | null) => void;

/**
 * The state machine behind the trainer screen: the current spot, the
 * coach round trip, the outs quiz, the playthrough reveal sequence and the
 * showdown. The profile is owned by the caller so this hook only applies
 * Elo changes through the setter.
 *
 * Mode and preference changes deal a fresh hand through effects rather
 * than in the change handlers so a preference restored from storage also
 * deals the right kind of hand on first load.
 */
export function useTrainerSession(profile: PlayerProfile | null, setProfile: ProfileSetter) {
  const [state, setState] = useState<TrainingState | null>(null);
  const [gameMode, setGameMode] = useState<GameMode>("HANDS");

  const [loadingCoach, setLoadingCoach] = useState(false);
  const [coach, setCoach] = useState<CoachResponse | null>(null);
  const [coachError, setCoachError] = useState<string | null>(null);

  const [outsResult, setOutsResult] = useState<null | { answer: number; kind: OutsGrade }>(null);
  const [outsBonus, setOutsBonus] = useState<null | { correct: number; bonus: number }>(null);
  const [outsAttempts, setOutsAttempts] = useState(0);
  const [outsReveal, setOutsReveal] = useState(false);
  const [eloChange, setEloChange] = useState<number | null>(null);
  const [decisionTaken, setDecisionTaken] = useState(false);
  const [rankCongrats, setRankCongrats] = useState<string | null>(null);
  const [showdown, setShowdown] = useState<ShowdownResult | null>(null);
  const [turnPointer, setTurnPointer] = useState<TurnPointer>(null);
  const [runoutOpen, setRunoutOpen] = useState(false);
  const [runoutEloNote, setRunoutEloNote] = useState<string | null>(null);

  const timers = useRevealTimers();
  const handsPrefRef = useRef<HandsPreference>(DEFAULT_HANDS_PREFERENCE);
  const handsPreference = profile?.preferredHands ?? DEFAULT_HANDS_PREFERENCE;

  const resetForNewHand = useCallback(({
    incrementHand = false,
    modeOverride,
    handsPrefOverride,
  }: {
    incrementHand?: boolean;
    modeOverride?: GameMode;
    handsPrefOverride?: HandsPreference;
  } = {}) => {
    timers.clear();
    const nextMode = modeOverride ?? gameMode;
    const pref = handsPrefOverride ?? handsPrefRef.current;
    setState(generateTrainingSpot(nextMode, pref));
    setCoach(null);
    setCoachError(null);
    setLoadingCoach(false);
    setOutsResult(null);
    setOutsBonus(null);
    setOutsAttempts(0);
    setOutsReveal(false);
    setEloChange(null);
    setDecisionTaken(false);
    setShowdown(null);
    setTurnPointer(null);
    setRunoutOpen(false);
    setRunoutEloNote(null);

    if (incrementHand) {
      setProfile(p => {
        if (!p) return p;
        return {
          ...p,
          totalHands: p.totalHands + 1,
          lastPlayedISO: new Date().toISOString(),
        };
      });
    }
  }, [gameMode, setProfile, timers]);

  useEffect(() => {
    handsPrefRef.current = handsPreference;
  }, [handsPreference]);

  useEffect(() => {
    if (gameMode === "HANDS") return;
    resetForNewHand({ modeOverride: gameMode });
  }, [gameMode, resetForNewHand]);

  useEffect(() => {
    if (gameMode !== "HANDS") return;
    resetForNewHand({ modeOverride: "HANDS", handsPrefOverride: handsPreference });
  }, [gameMode, handsPreference, resetForNewHand]);

  /**
   * Stores the new preference. The effect above deals the fresh Hands-mode
   * spot once the profile updates; the handler used to deal one as well,
   * so every preference change dealt two hands and kept the second.
   */
  function changeHandsPreference(pref: HandsPreference) {
    if (handsPrefRef.current === pref) return;
    handsPrefRef.current = pref;
    setProfile(p => {
      if (!p || p.preferredHands === pref) return p;
      return { ...p, preferredHands: pref };
    });
  }

  function nextHand() {
    resetForNewHand({ incrementHand: true });
  }

  /** The hidden Elo setter in the stats modal. Clears the flash so no stale delta shows. */
  function cheatSetElo(elo: number) {
    setProfile(p => (p ? withElo(p, elo) : p));
    setEloChange(null);
  }

  /** Playthrough only: the flat runout Elo, applied after a short delay. */
  function applyRunoutElo(result: ShowdownResult) {
    if (gameMode === "HANDS") return;
    const delta = runoutEloDelta(result.heroFolded, result.heroWouldResult);
    if (delta === 0) return;
    setProfile(p => (p ? withEloDelta(p, delta, true) : p));
    setEloChange(prev => (prev ?? 0) + delta);
    setRunoutEloNote(fmt(COPY.runout.eloNote, {
      delta: signedDelta(delta),
      reason: runoutReason(result),
    }));
  }

  function scheduleRunoutElo(result: ShowdownResult) {
    if (gameMode === "HANDS") return;
    timers.schedule(() => applyRunoutElo(result), SCENARIO.playthrough.runoutEloDelayMs);
  }

  /** Clears the per-street quiz and decision state so the hero can act again. */
  function resetStreetState() {
    setOutsResult(null);
    setOutsBonus(null);
    setOutsAttempts(0);
    setOutsReveal(false);
    setDecisionTaken(false);
  }

  function finishHand(currentState: TrainingState, heroAction: PlayerAction, heroFolded: boolean) {
    setState(prev => prev ? {
      ...prev,
      board: currentState.fullBoard as BoardView,
      street: "RIVER",
      facing: null,
    } : prev);
    const result = resolveShowdown({
      heroHand: currentState.heroHand,
      opponents: currentState.opponentHands!,
      board: currentState.fullBoard!,
      heroFolded,
      heroAction,
      decisionBoard: currentState.board,
    });
    setShowdown(result);
    scheduleRunoutElo(result);
    setDecisionTaken(true);
  }

  /**
   * Reveals the next street's opponent actions one at a time, then hands
   * the turn to the hero. The pointer moves across the seats on a fixed
   * cadence; the final step swaps in the new board and clears the pointer.
   */
  function playOpponentSequence({
    actions,
    boardView,
    facing,
    potBb,
    outsInfo,
    nextStreet,
    prevBoard,
    prevStreet,
  }: {
    actions: OpponentActionRecord[];
    boardView: BoardView;
    facing: TrainingState["facing"];
    potBb: number;
    outsInfo: TrainingState["outsInfo"];
    nextStreet: Street;
    prevBoard: BoardView;
    prevStreet: Street;
  }) {
    timers.clear();
    const blankActions: OpponentActionRecord[] = actions.map(a => ({ name: a.name, action: "CHECK" as OpponentAction }));
    const step = SCENARIO.playthrough.revealStepMs;

    setState(prev => prev ? {
      ...prev,
      street: prevStreet,
      board: prevBoard,
      opponentActions: blankActions,
      potBb,
      facing: null,
      outsInfo,
    } : prev);

    actions.forEach((action, idx) => {
      timers.schedule(() => {
        setTurnPointer(idx);
        setState(prev => prev ? {
          ...prev,
          opponentActions: actions.map((a, i) => i <= idx ? a : blankActions[i]),
          facing: action.action === "BET" || action.action === "RAISE" ? { type: action.action, sizeBb: action.sizeBb ?? 0 } : prev.facing,
        } : prev);
      }, idx * step);
    });

    timers.schedule(() => {
      setState(prev => prev ? {
        ...prev,
        street: nextStreet,
        board: boardView,
        opponentActions: actions,
        facing,
      } : prev);
      resetStreetState();
      setTurnPointer(null);
    }, actions.length * step + SCENARIO.playthrough.revealTailMs);
  }

  /** Playthrough only: moves the hand to the next street or to showdown after the hero acts. */
  function advanceStreetAfterAction(currentState: TrainingState, heroAction: PlayerAction, raiseSizeBb?: number) {
    if (!currentState.fullBoard || !currentState.opponentHands) return;

    const seq = streetSequenceFrom(currentState.street);
    const nextIdx = seq.indexOf(currentState.street) + 1;

    const facingSize = currentState.facing?.sizeBb ?? 0;
    let potAfterHero = currentState.potBb;
    if (heroAction === "CALL" || heroAction === "RAISE") {
      potAfterHero += facingSize;
    }
    if (heroAction === "RAISE") {
      potAfterHero += Math.max(0, (raiseSizeBb ?? 0) - facingSize);
    }

    if (heroAction === "FOLD") {
      finishHand(currentState, heroAction, true);
      return;
    }

    const isRiver = currentState.street === "RIVER" || nextIdx >= seq.length;
    if (isRiver) {
      finishHand(currentState, heroAction, false);
      return;
    }

    const nextStreet = seq[nextIdx];
    const boardView = boardForStreet(currentState.fullBoard, nextStreet);
    const { actions, facing, potBb } = opponentActionsForStreet(currentState.opponentHands, boardView, nextStreet, potAfterHero);
    const outsInfo = computeOutsInfo(currentState.heroHand, boardCardsFromView(boardView), nextStreet) ?? undefined;

    if (gameMode !== "HANDS") {
      playOpponentSequence({
        actions,
        boardView,
        facing,
        potBb,
        outsInfo,
        nextStreet,
        prevBoard: currentState.board,
        prevStreet: currentState.street,
      });
    } else {
      setState(prev => prev ? {
        ...prev,
        street: nextStreet,
        board: boardView,
        opponentActions: actions,
        potBb,
        facing,
        outsInfo,
      } : prev);
      resetStreetState();
    }
  }

  /** Grades an outs guess, pays the Elo bonus, and reveals the answer after the last attempt. */
  function submitOutsGuess(answer: number, kind: OutsGrade) {
    setOutsResult({ answer, kind });
    const attempt = outsAttempts + 1;
    setOutsAttempts(attempt);

    const correct = state?.outsInfo?.correctOuts ?? 0;
    const bonus = outsQuizBonus(answer, correct, attempt, penaltyFactorForRank(profile?.rank));

    setOutsBonus({ correct, bonus });
    if (attempt >= ELO_RULES.outsQuiz.maxAttempts) setOutsReveal(true);
    setEloChange(bonus !== 0 ? bonus : null);

    if (bonus > 0) {
      setProfile(p => {
        if (!p) return p;
        const next = withEloDelta(p, bonus, false);
        if (next.rank !== p.rank) {
          setRankCongrats(rankUpMessage(next.rank));
        }
        return {
          ...next,
          correctOutsCount: kind === "perfect" ? p.correctOutsCount + 1 : p.correctOutsCount,
        };
      });
    }
  }

  /** Sends the decision to the coach, applies the Elo result, and (playthrough) advances the hand. */
  async function judge(heroAction: PlayerAction, raiseSizeBb?: number) {
    if (!state || decisionTaken) return;
    const currentState = state;
    setDecisionTaken(true);
    setCoach(null);
    setCoachError(null);
    setLoadingCoach(true);
    if (gameMode !== "HANDS") {
      advanceStreetAfterAction(currentState, heroAction, raiseSizeBb);
    }

    try {
      const data = await requestCoachFeedback({
        state: currentState,
        heroAction,
        raiseSizeBb: raiseSizeBb ?? null,
        outsAnswer: outsResult?.answer ?? null,
      });

      const adjustedDelta = applyPenaltyFactor(eloDeltaFromScore(data.score), penaltyFactorForRank(profile?.rank));

      setProfile(p => {
        if (!p) return p;
        const next = withEloDelta(p, adjustedDelta, true);
        if (next.rank !== p.rank) {
          setRankCongrats(rankUpMessage(next.rank));
        }
        return {
          ...next,
          totalDecisions: p.totalDecisions + 1,
          lastCoachScore: data.score,
        };
      });
      setEloChange(adjustedDelta !== 0 ? adjustedDelta : null);

      setCoach(data);
    } catch (e: unknown) {
      setCoachError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoadingCoach(false);
    }
  }

  return {
    state,
    gameMode,
    setGameMode,
    changeHandsPreference,
    nextHand,
    cheatSetElo,
    judge,
    submitOutsGuess,
    loadingCoach,
    coach,
    coachError,
    outsBonus,
    outsAttempts,
    outsReveal,
    eloChange,
    decisionTaken,
    showdown,
    turnPointer,
    runoutOpen,
    setRunoutOpen,
    runoutEloNote,
    rankCongrats,
    dismissRankCongrats: () => setRankCongrats(null),
  } as const;
}
