"use client";

import { useState } from "react";
import { useProfile } from "@/features/profile/useProfile";
import { useTrainerSession } from "./useTrainerSession";
import { TableSeats } from "./TableSeats";
import { CongratsModal } from "./CongratsModal";
import { RunoutModal } from "./RunoutModal";
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
import { GAME_MODES } from "@/data/game-modes";
import { ELO_RULES } from "@/data/elo";
import { COPY } from "@/data/copy";

/**
 * The single page of the app: profile and rank on the left, the table and
 * action bar on the right, dialogs on top. All game logic lives in
 * useTrainerSession; this component only lays things out and owns which
 * dialogs are open.
 */
export function TrainerScreen() {
  const { profile, setProfile } = useProfile();
  const session = useTrainerSession(profile, setProfile);
  const { state, gameMode } = session;

  const [statsOpen, setStatsOpen] = useState(false);
  const [ranksOpen, setRanksOpen] = useState(false);

  if (!profile || !state) {
    return (
      <div className="page-shell">
        <div className="page-content">
          <div className="panel">{COPY.app.loading}</div>
        </div>
      </div>
    );
  }

  const facingCall = state.facing?.sizeBb ?? null;
  const cardsToCome = state.street === "FLOP" || state.street === "TURN";

  return (
    <div className="page-shell">
      <div className="page-content">
        <Header
          onShowStats={() => setStatsOpen(true)}
          onNextHand={session.nextHand}
          nextLabel={GAME_MODES[gameMode].nextLabel}
          gameMode={gameMode}
          onChangeMode={session.setGameMode}
        />

        <div className="grid-main">
          <div className="stack-lg">
            <RankBadge rank={profile.rank} />
            <EloBar elo={profile.elo} eloChange={session.eloChange} rankName={profile.rank} />
            <button className="btn ghost" onClick={() => setRanksOpen(true)}>
              {COPY.ranks.viewAll}
            </button>

            <OutsPanel
              state={state}
              disabled={session.loadingCoach}
              hasEmpty={cardsToCome}
              lastResult={session.outsBonus}
              revealAnswer={session.outsReveal}
              correctOuts={state.outsInfo?.correctOuts ?? 0}
              attemptsLeft={Math.max(0, ELO_RULES.outsQuiz.maxAttempts - session.outsAttempts)}
              onSubmit={session.submitOutsGuess}
            />

            <CoachPanel
              loading={session.loadingCoach}
              coach={session.coach}
              error={session.coachError}
              eloChange={session.eloChange}
            />
          </div>

          <div className="stack-lg">
            <div className="panel-hero">
              <div className="hero-overlay" />
              <div className="hero-content stack-md">
                <Board state={state} gameMode={gameMode} />

                <div className="hero-hand">
                  <div className="label">{COPY.board.yourHand}</div>
                  <div className="card-row">
                    <CardView card={state.heroHand[0]} />
                    <CardView card={state.heroHand[1]} />
                  </div>
                  <TableSeats
                    state={state}
                    gameMode={gameMode}
                    showdown={session.showdown}
                    turnPointer={session.turnPointer}
                  />
                </div>

                <ActionBar
                  disabled={session.decisionTaken}
                  callAmount={facingCall}
                  onAction={(a, raise) => {
                    session.judge(a, raise);
                  }}
                />
              </div>
            </div>

            {session.showdown && gameMode !== "HANDS" && (
              <div className="stack-sm">
                <button className="btn" onClick={() => session.setRunoutOpen(true)}>
                  {COPY.runout.detailsButton}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <StatsModal
        open={statsOpen}
        onClose={() => setStatsOpen(false)}
        profile={profile}
        onCheatSetElo={session.cheatSetElo}
        onChangeHandsPreference={session.changeHandsPreference}
      />
      <RankModal open={ranksOpen} onClose={() => setRanksOpen(false)} currentRank={profile.rank} />
      {session.rankCongrats && (
        <CongratsModal message={session.rankCongrats} rank={profile.rank} onClose={session.dismissRankCongrats} />
      )}
      {session.runoutOpen && session.showdown && (
        <RunoutModal
          showdown={session.showdown}
          gameMode={gameMode}
          eloNote={session.runoutEloNote}
          onClose={() => session.setRunoutOpen(false)}
        />
      )}
    </div>
  );
}
