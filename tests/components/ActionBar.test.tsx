// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ActionBar } from "@/components/ActionBar";

afterEach(cleanup);

describe("ActionBar", () => {
  it("shows Check with no bet to face and Call with the amount otherwise", () => {
    const { rerender } = render(<ActionBar callAmount={null} onAction={() => {}} />);
    expect(screen.getByRole("button", { name: "Check" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Raise ($3.00)" })).toBeTruthy();
    rerender(<ActionBar callAmount={4} onAction={() => {}} />);
    expect(screen.getByRole("button", { name: "Call ($4.00)" })).toBeTruthy();
  });

  it("resets the raise slider when the bet faced changes, and keeps a manual value otherwise", () => {
    const { rerender } = render(<ActionBar callAmount={4} onAction={() => {}} />);
    const slider = screen.getByRole("slider") as HTMLInputElement;
    expect(slider.value).toBe("6");
    fireEvent.change(slider, { target: { value: "9" } });
    expect(screen.getByRole("button", { name: "Raise ($9.00)" })).toBeTruthy();
    rerender(<ActionBar callAmount={4} onAction={() => {}} />);
    expect(slider.value).toBe("9");
    rerender(<ActionBar callAmount={2} onAction={() => {}} />);
    expect(slider.value).toBe("3");
  });

  it("passes the action and raise size to the handler and disables when told", () => {
    const onAction = vi.fn();
    const { rerender } = render(<ActionBar callAmount={4} onAction={onAction} />);
    fireEvent.click(screen.getByRole("button", { name: "Fold" }));
    fireEvent.click(screen.getByRole("button", { name: "Raise ($6.00)" }));
    expect(onAction.mock.calls).toEqual([["FOLD"], ["RAISE", 6]]);
    rerender(<ActionBar callAmount={4} onAction={onAction} disabled />);
    expect((screen.getByRole("button", { name: "Fold" }) as HTMLButtonElement).disabled).toBe(true);
  });
});
