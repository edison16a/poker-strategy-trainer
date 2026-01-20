import type { RankName } from "./types";

export const RANKS: Array<{ name: RankName; minElo: number; maxElo: number }> = [
  { name: "Bronze", minElo: 0, maxElo: 999 },
  { name: "Silver", minElo: 1000, maxElo: 1999 },
  { name: "Gold", minElo: 2000, maxElo: 2999 },
  { name: "Diamond", minElo: 3000, maxElo: 3999 },
  { name: "Mythic", minElo: 4000, maxElo: 4999 },
  { name: "Legendary", minElo: 5000, maxElo: 5999 },
  { name: "Champion", minElo: 6000, maxElo: Number.POSITIVE_INFINITY },
];

export function rankFromElo(elo: number): RankName {
  const found = RANKS.find(r => elo >= r.minElo && elo <= r.maxElo);
  return found?.name ?? "Bronze";
}

export function rankProgress(elo: number) {
  const r = RANKS.find(x => elo >= x.minElo && elo <= x.maxElo) ?? RANKS[0];
  const next = RANKS[Math.min(RANKS.findIndex(x => x.name === r.name) + 1, RANKS.length - 1)];
  if (r.name === "Champion") return { current: r, next: r, pct: 1 };

  const denom = (r.maxElo - r.minElo) || 1;
  const pct = Math.max(0, Math.min(1, (elo - r.minElo) / denom));
  return { current: r, next, pct };
}

export function rankImagePath(rank: RankName) {
  return `/ranks/${rank.toLowerCase()}.png`;
}
