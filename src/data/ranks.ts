import raw from "./ranks.json";
import type { RankName } from "@/domain/types";

/**
 * A rank tier on the Elo ladder.
 *
 * `maxElo` is `null` in the JSON for the open-ended top tier because JSON has
 * no representation for infinity. The loader turns it into
 * `Number.POSITIVE_INFINITY` so range checks stay simple.
 */
export type RankTier = {
  name: RankName;
  minElo: number;
  maxElo: number;
  /** Marketing-style percentile shown in the rank list and congrats modal. */
  topPct: string;
  /**
   * Multiplier applied to Elo penalties (wrong outs guesses and bad decisions).
   * Low ranks are punished gently so beginners are not bounced back to zero.
   */
  outsPenaltyFactor: number;
  /** Public path of the tier's badge image. */
  image: string;
};

export type ChampionLadder = {
  minElo: number;
  ceilingElo: number;
  bottomGlobalRank: number;
};

/** Ordered from lowest to highest tier. Order in the JSON is significant. */
export const RANK_LADDER: RankTier[] = raw.ladder.map(tier => ({
  ...tier,
  name: tier.name as RankName,
  maxElo: tier.maxElo ?? Number.POSITIVE_INFINITY,
}));

/** Used when a profile carries a rank name the ladder does not know. */
export const UNKNOWN_RANK_PENALTY_FACTOR: number = raw.unknownRankPenaltyFactor;

/** Parameters of the synthetic global leaderboard shown to Champions. */
export const CHAMPION_LADDER: ChampionLadder = raw.championLadder;
