import raw from "./copy.json";

/**
 * Every user-facing string, grouped by the screen area that shows it.
 * Strings with `{name}` slots are templates for `fmt`. Strings that begin
 * or end with a space are deliberate: they are concatenated with a value in
 * the component, and the spacing has to live somewhere.
 */
export const COPY = raw;

/**
 * A tile in the stats grid: which profile counter it shows and its label.
 * The profile type is the source of truth for field names, so the cast
 * below keeps a typo in the JSON from compiling silently.
 */
export type StatCard = { field: "totalHands" | "totalDecisions" | "correctOutsCount" | "lastCoachScore"; label: string };

export const STAT_CARDS = raw.stats.cards as StatCard[];
