"use client";

import type { CoachResponse } from "@/domain/types";
import clsx from "clsx";
import { fmt } from "@/domain/text";
import { COPY } from "@/data/copy";

/** Score, verdict, best line and reasons for the last decision. */
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
  const C = COPY.coach;
  return (
    <div className="panel coach-panel">
      <div className="row-between">
        <div className="label-strong">{C.title}</div>
        {coach && (
          <div className={clsx("verdict-pill", coach.verdict)}>
            {coach.verdict.toUpperCase()}
          </div>
        )}
      </div>

      {loading && (
        <div className="coach-loading">
          {C.thinking}
          <div className="loading-track">
            <div className="loading-bar" />
          </div>
        </div>
      )}

      {!loading && error && (
        <div className="coach-error">
          {error}
          <div className="meta">{C.errorHint}</div>
        </div>
      )}

      {!loading && !error && !coach && (
        <div className="muted">{C.prompt}</div>
      )}

      {!loading && coach && (
        <div className="coach-body stack-sm">
          <div className="row-between">
            <div className="label">{C.score}</div>
            <div className="stat-number">{fmt(C.scoreValue, { score: coach.score })}</div>
          </div>

          {eloChange != null && (
            <div className="muted-strong">
              {C.eloChange}{" "}
              <span className={clsx("elo-change", eloChange >= 0 ? "elo-gain" : "elo-loss")}>
                {eloChange >= 0 ? "+" : ""}
                {eloChange}
              </span>
            </div>
          )}

          <div className="muted-strong">
            <span className="label-inline">{C.bestAction}</span>{" "}
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
