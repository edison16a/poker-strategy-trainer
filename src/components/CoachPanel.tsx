"use client";

import type { CoachResponse } from "@/lib/types";
import clsx from "clsx";

export function CoachPanel({
  loading,
  coach,
  error,
  eloChange,
}: {
  loading: boolean;
  coach: CoachResponse | null;
  error: string | null;
  eloChange: number | null;
}) {
  return (
    <div className="panel coach-panel">
      <div className="row-between">
        <div className="label-strong">AI Coach</div>
        {coach && (
          <div className={clsx("verdict-pill", coach.verdict)}>
            {coach.verdict.toUpperCase()}
          </div>
        )}
      </div>

      {loading && (
        <div className="coach-loading">
          Thinking…
          <div className="loading-track">
            <div className="loading-bar" />
          </div>
        </div>
      )}

      {!loading && error && (
        <div className="coach-error">
          {error}
          <div className="meta">
            If you see this often, check your `.env.local` and API key quota.
          </div>
        </div>
      )}

      {!loading && !error && !coach && (
        <div className="muted">
          Make a decision to get feedback (score + best action + why).
        </div>
      )}

      {!loading && coach && (
        <div className="coach-body stack-sm">
          <div className="row-between">
            <div className="label">Score</div>
            <div className="stat-number">{coach.score}/100</div>
          </div>

          {eloChange != null && (
            <div className="muted-strong">
              Elo change:{" "}
              <span className={clsx("elo-change", eloChange >= 0 ? "elo-gain" : "elo-loss")}>
                {eloChange >= 0 ? "+" : ""}
                {eloChange}
              </span>
            </div>
          )}

          <div className="muted-strong">
            <span className="label-inline">Best action:</span>{" "}
            <span className="text-strong">{coach.bestAction.toUpperCase()}</span>
            {coach.bestRaiseSizeBb != null && (
              <span className="muted"> (${coach.bestRaiseSizeBb.toFixed(2)})</span>
            )}
          </div>

          <div className="muted-strong">{coach.coachSummary}</div>

          <ul className="reason-list">
            {coach.reasons.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>

          {!!coach.conceptTags.length && (
            <div className="chip-row">
              {coach.conceptTags.map((t, i) => (
                <span key={i} className="chip">
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
