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
 * Every number the scoring engine uses, grouped by the step that reads it,
 * plus the copy templates for reasons and summaries.
 *
 * Templates use `{name}` placeholders filled by `fmt` in the domain text
 * helper. Numeric values are formatted by the caller before substitution so
 * the templates stay free of formatting rules.
 *
 * The values are the original inline constants moved verbatim; nothing was
 * retuned during the extraction.
 */
export const COACH = raw as {
  tuning: typeof raw.tuning & {
    verdicts: Array<{ minScore: number; verdict: CoachVerdict }>;
  };
  preflopProfiles: Record<PreflopProfileKey, PreflopProfileRow>;
  copy: Omit<typeof raw.copy, "futureCards"> & { futureCards: Record<Street, string> };
};
