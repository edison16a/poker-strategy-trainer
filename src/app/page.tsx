"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Card, CoachResponse, GameMode, OpponentAction, PlayerAction, PlayerProfile, RankName, TrainingState } from "@/lib/types";
import { generateTrainingSpot } from "@/lib/scenario";
import { loadProfile, saveProfile } from "@/lib/storage";
import { rankFromElo } from "@/lib/ranks";
import { clampElo, eloDeltaFromScore, randomGain } from "@/lib/elo";
import { resolveShowdown, evaluateHand, type ShowdownResult, type HandEval } from "@/lib/showdown";
import { computeOutsInfo } from "@/lib/outs";

import { Header } from "@/components/Header";
import { RankBadge } from "@/components/RankBadge";
import { EloBar } from "@/components/EloBar";
import { Board } from "@/components/Board";
import { CardView } from "@/components/CardView";
import { ActionBar } from "@/components/ActionBar";
import { CoachPanel } from "@/components/CoachPanel";
import { OutsPanel } from "@/components/OutsPanel";
import { StatsModal } from "@/components/StatsModal";
import { RankModal } from "@/components/RankModal";
import { ShowdownPanel } from "@/components/ShowdownPanel";

export default function Page() {
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [state, setState] = useState<TrainingState | null>(null);
  const [gameMode, setGameMode] = useState<GameMode>("HANDS");

  const [loadingCoach, setLoadingCoach] = useState(false);
  const [coach, setCoach] = useState<CoachResponse | null>(null);
  const [coachError, setCoachError] = useState<string | null>(null);

  const [outsResult, setOutsResult] = useState<null | { answer: number; kind: "perfect" | "close" | "wrong" }>(null);
  const [outsBonus, setOutsBonus] = useState<null | { correct: number; bonus: number }>(null);
  const [outsAttempts, setOutsAttempts] = useState(0);
  const [outsReveal, setOutsReveal] = useState(false);
  const [eloChange, setEloChange] = useState<number | null>(null);
  const [decisionTaken, setDecisionTaken] = useState(false);
  const [rankCongrats, setRankCongrats] = useState<string | null>(null);
  const [showdown, setShowdown] = useState<ShowdownResult | null>(null);

  const [statsOpen, setStatsOpen] = useState(false);
  const [ranksOpen, setRanksOpen] = useState(false);
  const revealTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const posTiming = (pos: TrainingState["heroPos"] | TrainingState["villainPos"]) => {
    switch (pos) {
      case "BTN":
      case "CO":
      case "BB":
        return "Last to act";
      case "UTG":
      case "SB":
        return "First to act";
      case "HJ":
      case "MP":
        return "Middle position";
      default:
        return "Position";
    }
  };

  const facingCall = state?.facing?.sizeBb ?? null;
  const hasEmptyBoard = state ? state.street === "FLOP" || state.street === "TURN" : false;

  function clearRevealTimers() {
    revealTimers.current.forEach((t) => clearTimeout(t));
    revealTimers.current = [];
  }

  const penaltyFactorForRank = (rank: RankName | undefined) => {
    switch (rank) {
      case "Bronze": return 0.3;
      case "Silver": return 0.4;
      case "Gold": return 0.6;
      case "Diamond": return 0.8;
      case "Mythic": return 1.0;
      case "Legendary": return 1.3;
      case "Champion": return 1.5;
      default: return 1;
    }
  };

  const resetForNewHand = useCallback(({ incrementHand = false, modeOverride }: { incrementHand?: boolean; modeOverride?: GameMode } = {}) => {
    clearRevealTimers();
    const nextMode = modeOverride ?? gameMode;
    const nextState = generateTrainingSpot(nextMode);
    setState(nextState);
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
  }, [gameMode]);

  useEffect(() => {
    const p = loadProfile();
    setProfile(p);
  }, []);

  useEffect(() => {
    resetForNewHand({ modeOverride: gameMode });
  }, [gameMode, resetForNewHand]);

  useEffect(() => {
    if (profile) saveProfile(profile);
  }, [profile]);

  useEffect(() => {
    return () => clearRevealTimers();
  }, []);

  function nextHand() {
    resetForNewHand({ incrementHand: true });
  }

  const streetSequenceFrom = (street: TrainingState["street"]): TrainingState["street"][] => {
    if (street === "PREFLOP") return ["PREFLOP", "FLOP", "TURN", "RIVER"];
    if (street === "FLOP") return ["FLOP", "TURN", "RIVER"];
    if (street === "TURN") return ["TURN", "RIVER"];
    return ["RIVER"];
  };

  type BoardView = { flop: [Card, Card, Card] | null; turn: Card | null; river: Card | null };

  const boardForStreet = (full: NonNullable<TrainingState["fullBoard"]>, street: TrainingState["street"]): BoardView => {
    if (street === "PREFLOP") return { flop: null, turn: null, river: null };
    if (street === "FLOP") return { flop: full.flop, turn: null, river: null };
    if (street === "TURN") return { flop: full.flop, turn: full.turn, river: null };
    return { flop: full.flop, turn: full.turn, river: full.river };
  };

  const boardCardsFromView = (view: BoardView): Card[] => {
    const cards: Card[] = [];
    if (view.flop) cards.push(...view.flop);
    if (view.turn) cards.push(view.turn);
    if (view.river) cards.push(view.river);
    return cards;
  };

  const opponentActionsForStreet = (
    opponentHands: NonNullable<TrainingState["opponentHands"]>,
    boardView: BoardView,
    street: TrainingState["street"],
    potBb: number,
  ) => {
    const boardCards = boardCardsFromView(boardView);

    type ActionOut = { name: "OppA" | "OppB" | "OppC"; action: OpponentAction; sizeBb?: number };
    const evaluated: Array<{ idx: number; eval: HandEval }> = opponentHands.map((opp, idx) => ({
      idx,
      eval: evaluateHand([...opp.hand, ...boardCards]),
    }));

    const primary = evaluated.sort((a, b) => b.eval.scoreVector[0] - a.eval.scoreVector[0])[0]?.idx ?? 0;
    const strength = evaluated.find(e => e.idx === primary)?.eval.scoreVector[0] ?? 0;
    const betBias = street === "RIVER" ? 0.65 : street === "TURN" ? 0.55 : street === "FLOP" ? 0.5 : 0.4;
    const shouldBet = Math.random() < (betBias + strength * 0.04);
    const sizeMults = street === "PREFLOP" ? [1.5, 2.2, 3, 4] : street === "FLOP" ? [0.3, 0.5, 0.75] : [0.35, 0.6, 0.9, 1.2];
    const sizeBb = shouldBet ? Math.max(1, Math.round(potBb * sizeMults[Math.floor(Math.random() * sizeMults.length)] * 100) / 100) : 0;
    let facing: TrainingState["facing"] = null;
    let newPot = potBb;

    const opponentActions: ActionOut[] = opponentHands.map((opp, idx) => {
      if (shouldBet && idx === primary) {
        facing = { type: street === "PREFLOP" ? "RAISE" : "BET", sizeBb };
        newPot = Math.round((newPot + sizeBb) * 100) / 100;
        return { name: opp.name, action: street === "PREFLOP" ? "RAISE" : "BET", sizeBb };
      }
      if (shouldBet) {
        const evalScore = evaluated.find(e => e.idx === idx)?.eval.scoreVector[0] ?? 0;
        if (evalScore >= 2 && Math.random() > 0.2) {
          newPot = Math.round((newPot + sizeBb) * 100) / 100;
          return { name: opp.name, action: "CALL", sizeBb };
        }
        if (Math.random() < 0.2) return { name: opp.name, action: "FOLD" };
        return { name: opp.name, action: "CALL", sizeBb };
      }
      return { name: opp.name, action: "CHECK" };
    });

    return { actions: opponentActions, facing, potBb: newPot };
  };

  function advanceStreetAfterAction(currentState: TrainingState, heroAction: PlayerAction, raiseSizeBb?: number) {
    if (!currentState.fullBoard || !currentState.opponentHands) return;

    const seq = streetSequenceFrom(currentState.street);
    const nextIdx = seq.indexOf(currentState.street) + 1;

    const basePot = currentState.potBb;
    const facingSize = currentState.facing?.sizeBb ?? 0;
    let potAfterHero = basePot;
    if (heroAction === "CALL" || heroAction === "RAISE") {
      potAfterHero += facingSize;
    }
    if (heroAction === "RAISE") {
      const extra = Math.max(0, (raiseSizeBb ?? 0) - facingSize);
      potAfterHero += extra;
    }

    if (heroAction === "FOLD") {
      setState(prev => prev ? {
        ...prev,
        board: currentState.fullBoard as TrainingState["board"],
        street: "RIVER",
        facing: null,
      } : prev);
      const result = resolveShowdown({
        heroHand: currentState.heroHand,
        opponents: currentState.opponentHands,
        board: currentState.fullBoard,
        heroFolded: true,
        heroAction,
      });
      setShowdown(result);
      setDecisionTaken(true);
      return;
    }

    const isRiver = currentState.street === "RIVER" || nextIdx >= seq.length;
    if (isRiver) {
      setState(prev => prev ? {
        ...prev,
        board: currentState.fullBoard as TrainingState["board"],
        street: "RIVER",
        facing: null,
      } : prev);
      const result = resolveShowdown({
        heroHand: currentState.heroHand,
        opponents: currentState.opponentHands,
        board: currentState.fullBoard,
        heroFolded: false,
        heroAction,
      });
      setShowdown(result);
      setDecisionTaken(true);
      return;
    }

    const nextStreet = seq[nextIdx];
    const boardView = boardForStreet(currentState.fullBoard, nextStreet);
    const { actions, facing, potBb } = opponentActionsForStreet(currentState.opponentHands, boardView, nextStreet, potAfterHero);
    const outsInfo = computeOutsInfo(currentState.heroHand, boardCardsFromView(boardView), nextStreet) ?? undefined;

    setState(prev => prev ? {
      ...prev,
      street: nextStreet,
      board: boardView as TrainingState["board"],
      opponentActions: actions as TrainingState["opponentActions"],
      potBb,
      facing,
      outsInfo,
    } : prev);

    // fresh outs + decision for the new street
    setOutsResult(null);
    setOutsBonus(null);
    setOutsAttempts(0);
    setOutsReveal(false);
    setDecisionTaken(false);
  }

  function handleOutsResult(answer: number, kind: "perfect" | "close" | "wrong") {
    setOutsResult({ answer, kind });
    const attempt = outsAttempts + 1;
    setOutsAttempts(attempt);

    const correct = state?.outsInfo?.correctOuts ?? 0;
    const diff = Math.abs(answer - correct);
    let baseBonus = 0;
    if (diff === 0) {
      baseBonus = attempt === 1 ? 240 : 170;
    } else if (diff === 1) {
      baseBonus = attempt === 1 ? 170 : 108;
    } else if (diff === 2) {
      baseBonus = attempt === 1 ? 108 : 60;
    } else if (diff <= 3) {
      baseBonus = attempt === 1 ? 60 : 30;
    } else {
      baseBonus = attempt >= 2 ? -120 : -60;
    }
    const penaltyFactor = penaltyFactorForRank(profile?.rank);
    const bonus = baseBonus > 0 ? randomGain(baseBonus) : Math.round(baseBonus * penaltyFactor);

    setOutsBonus({ correct, bonus });
    if (attempt >= 2) setOutsReveal(true);
    setEloChange(bonus !== 0 ? bonus : null);

    if (bonus > 0) {
      setProfile(p => {
        if (!p) return p;
        const prevRank = p.rank;
        const newElo = clampElo(p.elo + bonus);
        const newRank = rankFromElo(newElo);
        if (newRank !== prevRank) {
          const msg =
            newRank === "Champion"
              ? `🎉 Congrats! You reached Champion. Global rank will appear in the Elo bar.`
              : `🎉 Congrats! New rank: ${newRank} (${TOP_MAP[newRank]}).`;
          setRankCongrats(msg);
        }
        return {
          ...p,
          elo: newElo,
          rank: newRank,
          correctOutsCount: kind === "perfect" ? p.correctOutsCount + 1 : p.correctOutsCount,
        };
      });
    }
  }

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
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          state: currentState,
          heroAction,
          raiseSizeBb: raiseSizeBb ?? null,
          outsAnswer: outsResult?.answer ?? null,
        }),
      });

      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || `HTTP ${res.status}`);
      }

      const data = (await res.json()) as CoachResponse;

      // Elo update
      const delta = eloDeltaFromScore(data.score);
      const penaltyFactor = penaltyFactorForRank(profile?.rank);
      const adjustedDelta = delta < 0 ? Math.round(delta * penaltyFactor) : delta;

      setProfile(p => {
        if (!p) return p;
        const newElo = clampElo(p.elo + adjustedDelta);
        const newRank = rankFromElo(newElo);
        const nextProfile = {
          ...p,
          elo: newElo,
          rank: newRank,
          totalDecisions: p.totalDecisions + 1,
          lastCoachScore: data.score,
          lastPlayedISO: new Date().toISOString(),
        };
        if (newRank !== p.rank) {
          const topMap: Record<RankName, string> = {
            Bronze: "Top 100%",
            Silver: "Top 60%",
            Gold: "Top 25%",
            Diamond: "Top 10%",
            Mythic: "Top 3%",
            Legendary: "Top 1%",
            Champion: "Top 0.37%",
          };
          const msg = newRank === "Champion"
            ? `🎉 Congrats! You reached Champion. Global rank will appear in the Elo bar.`
            : `🎉 Congrats! New rank: ${newRank} (${topMap[newRank]}).`;
          setRankCongrats(msg);
        }
        return nextProfile;
      });
      setEloChange(adjustedDelta !== 0 ? adjustedDelta : null);

      setCoach(data);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Unknown error";
      setCoachError(message);
    } finally {
      setLoadingCoach(false);
    }
  }

  return (
    !profile || !state ? (
      <div className="page-shell">
        <div className="page-content">
          <div className="panel">Loading…</div>
        </div>
      </div>
    ) : (
    <div className="page-shell">
      <div className="page-content">
        <Header
          onShowStats={() => setStatsOpen(true)}
          onNextHand={nextHand}
          nextLabel={gameMode === "GAME" ? "Next game" : "Next hand"}
          gameMode={gameMode}
          onChangeMode={(mode) => setGameMode(mode)}
        />

        <div className="grid-main">
          <div className="stack-lg">
            <RankBadge rank={profile.rank} />
            <EloBar elo={profile.elo} eloChange={eloChange} rankName={profile.rank} />
            <button className="btn ghost" onClick={() => setRanksOpen(true)}>
              View all ranks
            </button>

            <OutsPanel
              state={state}
              disabled={loadingCoach}
              hasEmpty={hasEmptyBoard}
              lastResult={outsBonus}
              revealAnswer={outsReveal}
              correctOuts={state.outsInfo?.correctOuts ?? 0}
              attemptsLeft={Math.max(0, 2 - outsAttempts)}
              onSubmit={(answer, kind) => {
                handleOutsResult(answer, kind);
              }}
            />

            <CoachPanel loading={loadingCoach} coach={coach} error={coachError} eloChange={eloChange} />
          </div>

          <div className="stack-lg">
            <div className="panel-hero">
              <div className="hero-overlay" />
              <div className="hero-content stack-md">
                <Board state={state} />

                <div className="hero-hand">
                  <div className="label">Your hand</div>
                  <div className="card-row">
                    <CardView card={state.heroHand[0]} />
                    <CardView card={state.heroHand[1]} />
                  </div>
                  <div className="action-row">
                    {(() => {
                      const oppBox = (idx: number) => {
                        const opp = state.opponentActions[idx];
                        const label = `Opp ${idx + 1}`;
                        const act = opp
                          ? (() => {
                              const size = opp.sizeBb ?? 0;
                              if (opp.action === "BET") return size > 0 ? `Bet $${size.toFixed(2)}` : "Check";
                              if (opp.action === "RAISE") return size > 0 ? `Raise $${size.toFixed(2)}` : "Check";
                              if (opp.action === "CHECK") return "Check";
                              if (opp.action === "CALL") return "Call";
                              if (opp.action === "FOLD") return "Fold";
                              return opp.action;
                            })()
                          : "—";
                        return { key: label, content: (
                          <div className="action-box" key={label}>
                            <div className="label">{label}</div>
                            <div className="muted-strong">{act}</div>
                          </div>
                        )};
                      };

                      const heroBox = (
                        <div className="action-box self" key="you">
                          <div className="label">You</div>
                          <div className="muted-strong">{posTiming(state.heroPos)}</div>
                        </div>
                      );

                      const boxes = [oppBox(0), oppBox(1), oppBox(2)];

                      if (state.heroPos === "HJ") {
                        return [
                          boxes[0].content,
                          heroBox,
                          boxes[1]?.content ?? <div className="action-box" key="empty1"> </div>,
                          boxes[2]?.content ?? <div className="action-box" key="empty2"> </div>,
                        ];
                      }
                      if (state.heroPos === "UTG") {
                        return [heroBox, boxes[0].content, boxes[1].content, boxes[2].content];
                      }
                      // late positions default last
                      return [boxes[0].content, boxes[1].content, boxes[2].content, heroBox];
                    })()}
                  </div>
                </div>

                <ActionBar
                  disabled={decisionTaken}
                  callAmount={facingCall}
                  onAction={(a, raise) => {
                    judge(a, raise);
                  }}
                />
              </div>
            </div>

            {showdown && (
              <ShowdownPanel result={showdown} mode={gameMode} />
            )}
          </div>
        </div>
      </div>

      <StatsModal
        open={statsOpen}
        onClose={() => setStatsOpen(false)}
        profile={profile}
        onCheatSetElo={(elo) => {
          setProfile(p => {
            if (!p) return p;
            const newElo = clampElo(elo);
            return { ...p, elo: newElo, rank: rankFromElo(newElo) };
          });
          setEloChange(null);
        }}
      />
      <RankModal open={ranksOpen} onClose={() => setRanksOpen(false)} currentRank={profile.rank} />
      {rankCongrats && (
        <div className="modal-backdrop">
          <div className="modal-scrim" onClick={() => setRankCongrats(null)} />
          <div className="modal-card congrats-card">
            <div className="congrats-content">
              <div className="congrats-title">Congratulations</div>
              <div className="congrats-text">{rankCongrats}</div>
              <div className="congrats-rank">
                <img src={`/ranks/${profile.rank.toLowerCase()}.png`} alt={profile.rank} />
                <div className="congrats-rank-name">{profile.rank}</div>
              </div>
              <button className="btn" onClick={() => setRankCongrats(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
    )
  );
}

const TOP_MAP: Record<RankName, string> = {
  Bronze: "Top 100%",
  Silver: "Top 60%",
  Gold: "Top 25%",
  Diamond: "Top 10%",
  Mythic: "Top 3%",
  Legendary: "Top 1%",
  Champion: "Top 0.37%",
};
