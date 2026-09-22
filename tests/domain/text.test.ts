import { describe, expect, it } from "vitest";
import { fmt } from "@/domain/text";

describe("fmt", () => {
  it("fills placeholders and leaves unknown ones visible", () => {
    expect(fmt("Opp {n} bets {size}", { n: 1, size: "2.50" })).toBe("Opp 1 bets 2.50");
    expect(fmt("Hi {name}", {})).toBe("Hi {name}");
  });
});
