import { describe, expect, it } from "vitest";
import { bestHands, compareHands, evaluateHand } from "@/domain/hand-eval";
import { cards } from "../helpers";

const ev = (codes: string) => evaluateHand(cards(codes));

describe("evaluateHand categories", () => {
  it("recognises every category with a readable label", () => {
    expect(ev("As Ks Qs Js 10s 2c 3d")).toMatchObject({ category: "STRAIGHT_FLUSH", label: "A-high straight flush" });
    expect(ev("9h 9d 9s 9c 2c 3d 4h")).toMatchObject({ category: "FOUR_OF_A_KIND", label: "Quad 9 with 4 kicker" });
    expect(ev("Kh Kd Ks 2c 2d 7h 9s")).toMatchObject({ category: "FULL_HOUSE", label: "Full house, Ks full of 2s" });
    expect(ev("2h 7h 9h Jh Kh 3c 4d")).toMatchObject({ category: "FLUSH", label: "K-high flush" });
    expect(ev("5c 6d 7h 8s 9c Ad 2d")).toMatchObject({ category: "STRAIGHT", label: "9-high straight" });
    expect(ev("Qc Qd Qh 4s 7c 9d 2h")).toMatchObject({ category: "THREE_OF_A_KIND", label: "Trips Q" });
    expect(ev("Jc Jd 4h 4s 9c 2d 7h")).toMatchObject({ category: "TWO_PAIR", label: "Two pair, Js and 4s" });
    expect(ev("8c 8d Ah 4s 9c 2d 7h")).toMatchObject({ category: "ONE_PAIR", label: "Pair of 8s" });
    expect(ev("Ac 8d Jh 4s 9c 2d 7h")).toMatchObject({ category: "HIGH_CARD", label: "A-high" });
  });

  it("finds the wheel and reports it five high", () => {
    expect(ev("Ac 2d 3h 4s 5c 9d Kh")).toMatchObject({ category: "STRAIGHT", scoreVector: [4, 5] });
    expect(ev("Ah 2h 3h 4h 5h 9d Kh")).toMatchObject({ category: "STRAIGHT_FLUSH", scoreVector: [8, 5] });
  });

  it("prefers a full house made of two trips and a flush over a straight", () => {
    expect(ev("7c 7d 7h 3s 3c 3d 9h")).toMatchObject({ category: "FULL_HOUSE", scoreVector: [6, 7, 3] });
    expect(ev("2h 3h 4h 5h 7h 6c 9d")).toMatchObject({ category: "FLUSH" });
  });

  it("uses the top five of a six-card flush", () => {
    expect(ev("2h 4h 6h 8h 10h Qh 3c").scoreVector).toEqual([5, 12, 10, 8, 6, 4]);
  });
});

describe("compareHands and bestHands", () => {
  it("breaks ties on kickers", () => {
    const a = ev("Ac Kd 9h 9s 4c 2d 7h");
    const b = ev("Qc Jd 9h 9s 4c 2d 7h");
    expect(compareHands(a, b)).toBeGreaterThan(0);
    expect(compareHands(b, a)).toBeLessThan(0);
  });

  it("treats identical five-card hands as a tie", () => {
    const board = "9h 9s 4c 2d 7h";
    const a = ev(`Ac Kd ${board}`);
    const b = ev(`Ad Kc ${board}`);
    expect(compareHands(a, b)).toBe(0);
  });

  it("returns every player tied for best, in input order", () => {
    const board = "5c 6d 7h 8s 9c";
    const players = [
      { id: "x", evaluation: ev(`2c 3d ${board}`) },
      { id: "y", evaluation: ev(`Ah Kd ${board}`) },
      { id: "z", evaluation: ev(`10c 2h ${board}`) },
      { id: "w", evaluation: ev(`10d 3h ${board}`) },
    ];
    expect(bestHands(players).map(p => p.id)).toEqual(["z", "w"]);
    expect(bestHands([])).toEqual([]);
  });
});
