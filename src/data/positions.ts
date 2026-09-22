import raw from "./positions.json";
import type { HeroPosition, TablePosition, VillainPosition } from "@/domain/types";

/** Positions the hero can be dealt into, in no particular order. */
export const HERO_POSITIONS = raw.heroPositions as HeroPosition[];

export const VILLAIN_POSITIONS = raw.villainPositions as VillainPosition[];

/** Short description of when a position acts, shown under the hero seat. */
export const POSITION_TIMING = raw.timing as Record<TablePosition, string>;

export const UNKNOWN_POSITION_TIMING: string = raw.unknownTiming;

/**
 * Where the hero's seat box sits in the four-box table row (0 = leftmost).
 * Late positions go last so the row reads in action order.
 */
export const HERO_SEAT_INDEX = raw.heroSeatIndex as Record<HeroPosition, number>;

/**
 * Score bonus the coach grants for acting from a late position. Position is
 * worth real equity, so the engine nudges scores up for BTN/CO decisions.
 */
export const COACH_AGGRESSION_BONUS = raw.coachAggressionBonus as Record<HeroPosition, number>;
