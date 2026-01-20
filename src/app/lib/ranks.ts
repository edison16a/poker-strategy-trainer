import type { RankName } from "./types";

export const RANKS: Array<{ name: RankName; minElo: number; maxElo: number }> = [
  { name: "Bronze", minElo: 0, maxElo: 1499 },          // gap 1,500
  { name: "Silver", minElo: 1500, maxElo: 3299 },        // gap 1,800
  { name: "Gold", minElo: 3300, maxElo: 5499 },          // gap 2,200
  { name: "Diamond", minElo: 5500, maxElo: 8099 },       // gap 2,600
  { name: "Mythic", minElo: 8100, maxElo: 11299 },       // gap 3,200
  { name: "Legendary", minElo: 11300, maxElo: 14999 },   // gap 3,700
  { name: "Champion", minElo: 15000, maxElo: Number.POSITIVE_INFINITY },
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
