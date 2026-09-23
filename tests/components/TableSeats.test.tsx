// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { TableSeats } from "@/features/trainer/TableSeats";
import { resolveShowdown } from "@/domain/showdown";
import { cards, hand, spot } from "../helpers";
import type { FullBoard, TrainingState } from "@/domain/types";

afterEach(cleanup);

const [a, b, d, t, r] = cards("9h 9s 4c Kd 2h");
const fullBoard: FullBoard = { flop: [a, b, d], turn: t, river: r };
const opponentHands: TrainingState["opponentHands"] = [
  { name: "OppA", hand: hand("7c 8c") },
  { name: "OppB", hand: hand("Ad Qd") },
  { name: "OppC", hand: hand("4h 4s") },
];

function seatLabels(container: HTMLElement) {
  return Array.from(container.querySelectorAll(".action-box .label")).map(el => el.textContent);
}

describe("TableSeats", () => {
  it("orders the hero by position", () => {
    const base = spot({ opponentHands, fullBoard });
    const utg = render(<TableSeats state={{ ...base, heroPos: "UTG" }} gameMode="HANDS" showdown={null} turnPointer={null} />);
    expect(seatLabels(utg.container)).toEqual(["You", "Opp 1", "Opp 2", "Opp 3"]);
    cleanup();
    const hj = render(<TableSeats state={{ ...base, heroPos: "HJ" }} gameMode="HANDS" showdown={null} turnPointer={null} />);
    expect(seatLabels(hj.container)).toEqual(["Opp 1", "You", "Opp 2", "Opp 3"]);
    cleanup();
    const btn = render(<TableSeats state={{ ...base, heroPos: "BTN" }} gameMode="HANDS" showdown={null} turnPointer={null} />);
    expect(seatLabels(btn.container)).toEqual(["Opp 1", "Opp 2", "Opp 3", "You"]);
  });

  it("shows opponent actions and the hero's act order", () => {
    const state = spot({
      opponentHands, fullBoard, heroPos: "BTN",
      opponentActions: [{ name: "OppA", action: "BET", sizeBb: 2.5 }, { name: "OppB", action: "FOLD" }, { name: "OppC", action: "CALL", sizeBb: 2.5 }],
    });
    const { container } = render(<TableSeats state={state} gameMode="HANDS" showdown={null} turnPointer={0} />);
    const captions = Array.from(container.querySelectorAll(".action-box .muted-strong")).map(el => el.textContent);
    expect(captions).toEqual(["Bet $2.50", "Fold", "Call", "Last to act"]);
    expect(container.querySelectorAll(".action-box.turn-active")).toHaveLength(1);
    // Hands mode never renders opponent hole cards.
    expect(container.querySelectorAll(".action-box:not(.self) .card-shell")).toHaveLength(0);
  });

  it("reveals hole cards and flags the winner at showdown", () => {
    const state = spot({ heroHand: hand("Kc Qc"), opponentHands, fullBoard, heroPos: "BTN" });
    const showdown = resolveShowdown({
      heroHand: state.heroHand, opponents: opponentHands!, board: fullBoard,
      heroFolded: false, heroAction: "CALL", decisionBoard: { flop: fullBoard.flop, turn: null, river: null },
    });
    const { container } = render(<TableSeats state={state} gameMode="HANDS_PLUS" showdown={showdown} turnPointer={null} />);
    expect(container.querySelectorAll(".card-face")).toHaveLength(8);
    expect(container.querySelectorAll(".card-back")).toHaveLength(0);
    expect(seatLabels(container)).toEqual(["Opp 1", "Opp 2", "Opp 3 Won!", "You"]);
    expect(container.querySelector(".action-box.opp-winner .opp-hand-note")?.textContent).toBe("Full house, 4s full of 9s");

    cleanup();
    const hidden = render(<TableSeats state={state} gameMode="HANDS_PLUS" showdown={null} turnPointer={null} />);
    expect(hidden.container.querySelectorAll(".card-back")).toHaveLength(8);
  });
});
