"use client";

import { useEffect, useMemo, useState } from "react";
import type { TrainingState } from "@/lib/types";
import clsx from "clsx";

export function OutsPanel({
  state,
  onSubmit,
  disabled,
  hasEmpty,
  lastResult,
  revealAnswer,
  correctOuts,
  attemptsLeft,
}: {
  state: TrainingState;
  onSubmit: (answer: number, result: "perfect" | "close" | "wrong") => void;
  disabled?: boolean;
  hasEmpty: boolean;
  lastResult: { correct: number; bonus: number } | null;
  revealAnswer: boolean;
  correctOuts: number;
  attemptsLeft: number;
}) {
  const outsInfo = state.outsInfo;

  const [val, setVal] = useState<string>("");
  const [result, setResult] = useState<null | { kind: "perfect" | "close" | "wrong"; msg: string; guess: number }>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [showCallChart, setShowCallChart] = useState(false);

  const show = hasEmpty;

  const correct = outsInfo?.correctOuts ?? 0;
  const equity = outsInfo?.equityApproxPct ?? 0;
  const label = outsInfo?.drawLabel ?? "";
  const displayLabel = useMemo(() => {
    if (!label) return "";
    if (label.toLowerCase().includes("gutshot")) return "Straight draw";
    return label;
  }, [label]);

  const outsExplanation = useMemo(() => {
    if (!outsInfo) return "";
    const l = outsInfo.drawLabel.toLowerCase();
    if (l.includes("flush")) return "Flush draw: 9 cards of that suit remain in the deck.";
    if (l.includes("open-ended")) return "Open-ended straight draw: 4 cards on each end = 8 outs.";
    if (l.includes("gutshot")) return "Gutshot straight draw: 1 rank completes it from each side = 4 outs.";
    if (l.includes("combo")) return "Combo draw: outs from both straight and flush draws combined (overlap removed).";
    if (l.includes("trips")) return "Trips draw: pairing the board card rank to make trips.";
    if (l.includes("set")) return "Set draw: pairing your pocket pair into trips.";
    if (l.includes("two pair") || l.includes("full house")) return "Two pair/full house outs: pairing your other hole card on a paired board.";
    return `Draw: ${outsInfo.correctOuts} outs based on visible cards.`;
  }, [outsInfo]);

  useEffect(() => {
    // Reset UI when a new hand arrives
    setResult(null);
    setVal("");
    setShowHelp(false);
    setShowCallChart(false);
  }, [state]);

  if (!show) return null;

  function validate(n: number) {
    const d = Math.abs(n - correct);
    if (d === 0) return "perfect" as const;
    if (d <= 2) return "close" as const;
    return "wrong" as const;
  }

  return (
    <div className="panel outs-panel">
      <div className="row-between">
        <div className="label-strong">Outs Trainer</div>
        <div className="row-buttons">
          <button
            type="button"
            className="info-button"
            onClick={() => setShowCallChart(v => !v)}
            aria-label="Pot odds chart"
          >
            $
          </button>
          <button
            type="button"
            className="info-button"
            onClick={() => setShowHelp(v => !v)}
            aria-label="Show outs help"
          >
            ?
          </button>
        </div>
      </div>

      <div className="input-row">
        <input
          value={val}
          onChange={(e) => setVal(e.target.value.replace(/[^\d]/g, ""))}
          placeholder="Enter outs"
          className="input"
          disabled={disabled}
          inputMode="numeric"
        />
        <button
          onClick={() => {
            const n = Number(val);
            if (!Number.isFinite(n)) return;
            const kind = validate(n);
            const msg =
              kind === "perfect"
                ? `Great read. Your estimate implies ~${Math.min(100, n * 4)}% by river and ~${Math.min(100, n * 2)}% to the next card.`
                : kind === "close"
                ? `Close. Your outs guess gives ~${Math.min(100, n * 4)}% to river and ~${Math.min(100, n * 2)}% to the next card.`
                : `Keep refining. Your estimate implies ~${Math.min(100, n * 4)}% by river and ~${Math.min(100, n * 2)}% to the next card.`;
            setResult({ kind, msg, guess: n });
            onSubmit(n, kind);
          }}
          className="btn"
          disabled={disabled || attemptsLeft <= 0}
        >
          Submit
        </button>
      </div>

      {result && (
        <div className={clsx("result-banner", `result-${result.kind}`)}>
          <div className="muted-strong">
            {result.msg} (Attempts left: {Math.max(0, attemptsLeft)})
          </div>
          <div className="meta">
            {attemptsLeft <= 0 || revealAnswer ? (
              <>
                Correct outs: {revealAnswer || outsInfo ? (revealAnswer ? correctOuts : outsInfo?.correctOuts ?? "—") : "—"}.{" "}
                {outsExplanation && <span>Why: {outsExplanation} </span>}
              </>
            ) : null}
            Your guess: {result.guess}.{" "}
            {lastResult && (
              <span
                key={lastResult.bonus}
                className={clsx("elo-change", lastResult.bonus >= 0 ? "elo-gain" : "elo-loss")}
              >
                Elo {lastResult.bonus >= 0 ? "gain" : "loss"}: {lastResult.bonus >= 0 ? "+" : ""}
                {lastResult.bonus}
              </span>
            )}
          </div>
        </div>
      )}

      {showHelp && (
        <div className="info-overlay">
          <div className="muted-strong">
            <span className="label-inline">This hand:</span>{" "}
            {displayLabel || "Outs exercise"}
            {displayLabel.toLowerCase().includes("flush") && " (4 to a suit = 9 outs)"}
          </div>
          <div className="info-rules">
            <div className="info-pill">
              <div className="pill-label">Flop → River</div>
              <div className="pill-value">
                <span className="pill-caption">Outs to %</span>
                <span className="pill-math">Outs × 4 ≈ hit %</span>
              </div>
            </div>
            <div className="info-pill">
              <div className="pill-label">Next card</div>
              <div className="pill-value">
                <span className="pill-caption">Outs to %</span>
                <span className="pill-math">Outs × 2 ≈ hit %</span>
              </div>
            </div>
          </div>
          <div className="meta">
            Enter the number of outs (not a %). Outs = cards that improve you on the next card or by the river
            (e.g., flush draw: 9 outs; open-ended straight: 8; gutshot: 4). Pairs you already hold are not counted as outs.
          </div>
        </div>
      )}

      {showCallChart && (
        <div className="info-overlay">
          <div className="label-strong">Should I call?</div>
          <ul className="call-chart">
            <li><span>Call ⅓-pot</span><span>Need ~20%</span></li>
            <li><span>Call ½-pot</span><span>Need ~25%</span></li>
            <li><span>Call ⅔-pot</span><span>Need ~29%</span></li>
            <li><span>Call pot-sized</span><span>Need ~33%</span></li>
          </ul>
        </div>
      )}
    </div>
  );
}
