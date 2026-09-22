import type { RankName } from "./types";
import { CHAMPION_LADDER, RANK_LADDER, UNKNOWN_RANK_PENALTY_FACTOR, type RankTier } from "@/data/ranks";

export type { RankTier } from "@/data/ranks";

/** The tier whose Elo range contains `elo`; defaults to the bottom tier. */
export function rankTier(elo: number): RankTier {
  return RANK_LADDER.find(r => elo >= r.minElo && elo <= r.maxElo) ?? RANK_LADDER[0];
}

export function rankFromElo(elo: number): RankName {
  return rankTier(elo).name;
}

export function rankByName(name: RankName): RankTier | undefined {
  return RANK_LADDER.find(r => r.name === name);
}

/**
 * Current tier, the tier after it, and how far through the current tier the
 * Elo is (0..1). At the top tier `next` is the same tier and `pct` is 1, so
 * callers can detect "maxed out" with `current.name === next.name`.
 */
export function rankProgress(elo: number): { current: RankTier; next: RankTier; pct: number } {
  const r = rankTier(elo);
  const idx = RANK_LADDER.findIndex(x => x.name === r.name);
  const next = RANK_LADDER[Math.min(idx + 1, RANK_LADDER.length - 1)];
  if (idx === RANK_LADDER.length - 1) return { current: r, next: r, pct: 1 };

  const denom = (r.maxElo - r.minElo) || 1;
  const pct = Math.max(0, Math.min(1, (elo - r.minElo) / denom));
  return { current: r, next, pct };
}

export function rankImagePath(rank: RankName): string {
  return rankByName(rank)?.image ?? `/ranks/${rank.toLowerCase()}.png`;
}

/** "Top 25%" style caption for a tier. */
export function rankTopPct(rank: RankName): string {
  return rankByName(rank)?.topPct ?? RANK_LADDER[0].topPct;
}

/**
 * How hard Elo penalties hit at a given rank. Undefined (profile not loaded
 * yet) falls back to the neutral factor from the data file.
 */
export function penaltyFactorForRank(rank: RankName | undefined): number {
  if (!rank) return UNKNOWN_RANK_PENALTY_FACTOR;
  return rankByName(rank)?.outsPenaltyFactor ?? UNKNOWN_RANK_PENALTY_FACTOR;
}

/**
 * Synthetic global placement for Champions: a linear ladder from the
 * bottom rank at the Champion floor to #1 at the ceiling.
 *
 * The original implementation tried to move the ceiling over time, but it
 * measured elapsed time against a base of "now plus a counter", which is
 * never in the past, so the ceiling never moved. The placement therefore
 * always came out of this fixed formula. That behaviour is kept as-is (a
 * moving ceiling would be a visible change, and picking its epoch is a
 * product decision), and the dead timer machinery is gone.
 */
export function computeGlobalPlacement(elo: number): { globalRank: number; maxElo: number } {
  const { minElo, ceilingElo: maxElo, bottomGlobalRank } = CHAMPION_LADDER;
  const spread = Math.max(1, maxElo - minElo);
  const clamped = Math.min(Math.max(elo, minElo), maxElo);
  const ratio = (maxElo - clamped) / spread;
  const globalRank = Math.max(1, Math.ceil(1 + ratio * (bottomGlobalRank - 1)));
  return { globalRank, maxElo };
}
