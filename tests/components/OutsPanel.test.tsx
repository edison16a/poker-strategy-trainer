// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { OutsPanel } from "@/components/OutsPanel";
import { flopSpot } from "../helpers";
import type { TrainingState } from "@/domain/types";

afterEach(cleanup);

function panel(state: TrainingState, extra: Partial<Parameters<typeof OutsPanel>[0]> = {}) {
  return (
    <OutsPanel
      state={state}
      onSubmit={() => {}}
      hasEmpty
      lastResult={null}
      revealAnswer={false}
      correctOuts={state.outsInfo?.correctOuts ?? 0}
      attemptsLeft={2}
      {...extra}
    />
  );
}

const flushDraw = (): TrainingState => flopSpot("Ah 7h", "2h 9h Kc", {
  fullBoard: { flop: flopSpot("Ah 7h", "2h 9h Kc").board.flop!, turn: { r: "3", s: "s" }, river: { r: "4", s: "d" } },
  outsInfo: { correctOuts: 9, equityApproxPct: 36, drawLabel: "Flush draw" },
});

describe("OutsPanel", () => {
  it("renders nothing when there are no cards to come", () => {
    const { container } = render(panel(flushDraw(), { hasEmpty: false }));
    expect(container.innerHTML).toBe("");
  });

  it("grades a guess and reports it to the parent", () => {
    const onSubmit = vi.fn();
    render(panel(flushDraw(), { onSubmit }));
    fireEvent.change(screen.getByPlaceholderText("Enter outs"), { target: { value: "8" } });
    fireEvent.click(screen.getByRole("button", { name: "Submit" }));
    expect(onSubmit).toHaveBeenCalledWith(8, "close");
    expect(screen.getByText(/Close\. Your outs guess gives ~32% to river/)).toBeTruthy();
  });

  it("reveals the answer with the explanation after the last attempt", () => {
    render(panel(flushDraw(), { attemptsLeft: 0, revealAnswer: true }));
    fireEvent.change(screen.getByPlaceholderText("Enter outs"), { target: { value: "2" } });
    // Submit is disabled with no attempts left, so no result banner appears.
    expect((screen.getByRole("button", { name: "Submit" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("clears its result and input when a new hand is dealt", () => {
    const first = flushDraw();
    const { rerender } = render(panel(first));
    fireEvent.change(screen.getByPlaceholderText("Enter outs"), { target: { value: "9" } });
    fireEvent.click(screen.getByRole("button", { name: "Submit" }));
    expect(screen.getByText(/Great read/)).toBeTruthy();

    const next = flushDraw(); // a new fullBoard object identity means a new hand
    rerender(panel(next));
    expect(screen.queryByText(/Great read/)).toBeNull();
    expect((screen.getByPlaceholderText("Enter outs") as HTMLInputElement).value).toBe("");
  });

  it("toggles the help and pot-odds chart", () => {
    render(panel(flushDraw()));
    fireEvent.click(screen.getByLabelText("Show outs help"));
    expect(screen.getByText(/Flush draw \(4 to a suit = 9 outs\)/)).toBeTruthy();
    fireEvent.click(screen.getByLabelText("Pot odds chart"));
    expect(screen.getByText("Should I call?")).toBeTruthy();
    expect(screen.getByText("Call pot-sized")).toBeTruthy();
  });
});
