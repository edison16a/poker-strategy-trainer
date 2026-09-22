import type { BoardView, Card, FullBoard, Street } from "./types";
import { boardCardsFromView } from "./cards";

export const STREETS: Street[] = ["PREFLOP", "FLOP", "TURN", "RIVER"];

/** The given street and every street after it, in play order. */
export function streetSequenceFrom(street: Street): Street[] {
  return STREETS.slice(STREETS.indexOf(street));
}

/** The community cards a player would see on `street` given the full runout. */
export function boardForStreet(full: FullBoard, street: Street): BoardView {
  if (street === "PREFLOP") return { flop: null, turn: null, river: null };
  if (street === "FLOP") return { flop: full.flop, turn: null, river: null };
  if (street === "TURN") return { flop: full.flop, turn: full.turn, river: null };
  return { flop: full.flop, turn: full.turn, river: full.river };
}

/** Flat list of the community cards visible on `street`. */
export function boardCardsUpTo(full: FullBoard, street: Street): Card[] {
  return boardCardsFromView(boardForStreet(full, street));
}

/** Every community card, used by the showdown evaluator. */
export function fullBoardCards(full: FullBoard): Card[] {
  return [...full.flop, full.turn, full.river];
}
