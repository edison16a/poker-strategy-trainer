"use client";

import { useState } from "react";
import type { TrainingState } from "@/domain/types";
import clsx from "clsx";
import { displayDrawLabel, gradeOutsGuess, outsExplanation, ruleOfFourTwo } from "@/domain/outs";
import { fmt } from "@/domain/text";
import { COPY } from "@/data/copy";
import { OUTS } from "@/data/outs";

type Grade = "perfect" | "close" | "wrong";

/**
 * The outs quiz: guess the outs, get the rule-of-4/2 feedback, and after the
 * last attempt see the answer and why. Only rendered on the flop and turn.
 */
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
  onSubmit: (answer: number, result: Grade) => void;
  disabled?: boolean;
  hasEmpty: boolean;
  lastResult: { correct: number; bonus: number } | null;
  revealAnswer: boolean;
  correctOuts: number;
  attemptsLeft: number;
}) {
  const O = COPY.outs;
  const outsInfo = state.outsInfo;

  const [val, setVal] = useState<string>("");
  const [result, setResult] = useState<null | { kind: Grade; msg: string; guess: number }>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [showCallChart, setShowCallChart] = useState(false);

  // Reset when a new hand is dealt (the full board identity changes). This
  // used to be an effect; adjusting state during render avoids the extra
  // render and the flash of stale results.
  const [prevBoard, setPrevBoard] = useState(state.fullBoard);
  if (prevBoard !== state.fullBoard) {
    setPrevBoard(state.fullBoard);
    setResult(null);
    setVal("");
    setShowHelp(false);
    setShowCallChart(false);
  }

  const correct = outsInfo?.correctOuts ?? 0;
  const label = outsInfo?.drawLabel ?? "";
  const displayLabel = displayDrawLabel(label);
  const explanation = outsInfo ? outsExplanation(outsInfo) : "";

  if (!hasEmpty) return null;

  function submit() {
    const n = Number(val);
    if (!Number.isFinite(n)) return;
    const kind = gradeOutsGuess(n, correct);
    const { byRiver, nextCard } = ruleOfFourTwo(n);
    const template = kind === "perfect" ? O.resultPerfect : kind === "close" ? O.resultClose : O.resultWrong;
    setResult({ kind, msg: fmt(template, { river: byRiver, next: nextCard }), guess: n });
    onSubmit(n, kind);
  }

  const shownCorrect = revealAnswer ? correctOuts : outsInfo ? outsInfo.correctOuts : COPY.common.empty;

  return (
    <div className="panel outs-panel">
      <div className="row-between">
        <div className="label-strong">{O.title}</div>
        <div className="row-buttons">
          <button
            type="button"
            className="info-button"
            onClick={() => setShowCallChart(v => !v)}
            aria-label={O.chartButtonLabel}
          >
            {O.chartButton}
          </button>
          <button
            type="button"
            className="info-button"
            onClick={() => setShowHelp(v => !v)}
            aria-label={O.helpButtonLabel}
          >
            {O.helpButton}
          </button>
        </div>
      </div>

      <div className="input-row">
        <input
          value={val}
          onChange={(e) => setVal(e.target.value.replace(/[^\d]/g, ""))}
          placeholder={O.placeholder}
          className="input"
          disabled={disabled}
          inputMode="numeric"
        />
        <button
          onClick={submit}
          className="btn"
          disabled={disabled || attemptsLeft <= 0}
        >
          {COPY.common.submit}
        </button>
      </div>

      {result && (
        <div className={clsx("result-banner", `result-${result.kind}`)}>
          <div className="muted-strong">
            {result.msg}{fmt(O.attemptsLeft, { n: Math.max(0, attemptsLeft) })}
          </div>
          <div className="meta">
            {attemptsLeft <= 0 || revealAnswer ? (
              <>
                {fmt(O.correctOuts, { n: shownCorrect })}{" "}
                {explanation && <span>{O.why}{explanation} </span>}
              </>
            ) : null}
            {fmt(O.yourGuess, { n: result.guess })}{" "}
            {lastResult && (
              <span
                key={lastResult.bonus}
                className={clsx("elo-change", lastResult.bonus >= 0 ? "elo-gain" : "elo-loss")}
              >
                {lastResult.bonus >= 0 ? fmt(O.eloGain, { n: lastResult.bonus }) : fmt(O.eloLoss, { n: lastResult.bonus })}
              </span>
            )}
          </div>
        </div>
      )}

      {showHelp && (
        <div className="info-overlay">
          <div className="muted-strong">
            <span className="label-inline">{O.thisHand}</span>{" "}
            {displayLabel || O.exercise}
            {displayLabel.toLowerCase().includes("flush") && O.flushHint}
          </div>
          <div className="info-rules">
            <div className="info-pill">
              <div className="pill-label">{O.flopToRiver}</div>
              <div className="pill-value">
                <span className="pill-caption">{O.outsToPct}</span>
                <span className="pill-math">{O.ruleFour}</span>
              </div>
            </div>
            <div className="info-pill">
              <div className="pill-label">{O.nextCard}</div>
              <div className="pill-value">
                <span className="pill-caption">{O.outsToPct}</span>
                <span className="pill-math">{O.ruleTwo}</span>
              </div>
            </div>
          </div>
          <div className="meta">{O.help}</div>
        </div>
      )}

      {showCallChart && (
        <div className="info-overlay">
          <div className="label-strong">{O.shouldICall}</div>
          <ul className="call-chart">
            {OUTS.potOddsChart.map(row => (
              <li key={row.bet}><span>{row.bet}</span><span>{row.need}</span></li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
