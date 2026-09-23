import raw from "./coach.json";
import type { CoachVerdict, Street } from "@/domain/types";

export type PreflopTier = "premium" | "strong" | "speculative" | "trash";

/** One row of the preflop starting-hand table. The label takes a {hand} placeholder. */
export type PreflopProfileRow = {
  tier: PreflopTier;
  strength: number;
  equityHint: number;
  label: string;
};

export type PreflopProfileKey = keyof typeof raw.preflopProfiles;

/**
 * Conditions a starting hand must meet for a rule to apply. Every listed
 * field must hold; absent fields are not checked. `minHigh`/`minLow` are
 * the higher and lower card values (2..14), `maxGap` the rank distance.
 * The first rule whose conditions all hold picks the profile row.
 */
export type PreflopCondition = {
  pair?: boolean;
  suited?: boolean;
  minHigh?: number;
  minLow?: number;
  maxGap?: number;
};

export type PreflopRule = { profile: PreflopProfileKey; when?: PreflopCondition };

/**
 * Every number the scoring engine uses, grouped by the step that reads it,
 * plus the copy templates for reasons and summaries.
 *
 * `preflopRules` is the ordered starting-hand classifier: the first rule
 * whose conditions hold names the `preflopProfiles` row to use. Adding a
 * hand class means adding a rule and a row, with no code change.
 *
 * Templates use `{name}` placeholders filled by `fmt` in the domain text
 * helper. Numeric values are formatted by the caller before substitution so
 * the templates stay free of formatting rules.
 *
 * The values are the original inline constants moved verbatim; nothing was
 * retuned during the extraction.
 */
export const COACH = raw as unknown as {
  tuning: Omit<typeof raw.tuning, "verdicts"> & {
    verdicts: Array<{ minScore: number; verdict: CoachVerdict }>;
  };
  preflopProfiles: Record<PreflopProfileKey, PreflopProfileRow>;
  preflopRules: PreflopRule[];
  copy: Omit<typeof raw.copy, "futureCards"> & { futureCards: Record<Street, string> };
};
