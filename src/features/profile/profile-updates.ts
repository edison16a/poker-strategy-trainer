import type { PlayerProfile, RankName } from "@/domain/types";
import { clampElo } from "@/domain/elo";
import { rankFromElo, rankTopPct } from "@/domain/ranks";
import { fmt } from "@/domain/text";
import { COPY } from "@/data/copy";

/**
 * Applies an Elo delta and recomputes the rank. `touch` also bumps the
 * last-played timestamp; the outs quiz deliberately does not touch it, only
 * decisions and runouts do, so the flag is explicit.
 */
export function withEloDelta(p: PlayerProfile, delta: number, touch: boolean): PlayerProfile {
  const newElo = clampElo(p.elo + delta);
  return {
    ...p,
    elo: newElo,
    rank: rankFromElo(newElo),
    ...(touch ? { lastPlayedISO: new Date().toISOString() } : {}),
  };
}

/** Sets Elo directly (the hidden cheat in the stats modal). */
export function withElo(p: PlayerProfile, elo: number): PlayerProfile {
  const newElo = clampElo(elo);
  return { ...p, elo: newElo, rank: rankFromElo(newElo) };
}

/** Congratulation text for a new rank; Champions get the global-rank note. */
export function rankUpMessage(newRank: RankName): string {
  return newRank === "Champion"
    ? COPY.congrats.champion
    : fmt(COPY.congrats.newRank, { rank: newRank, topPct: rankTopPct(newRank) });
}
