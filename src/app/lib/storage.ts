import type { HandsPreference, PlayerProfile } from "./types";
import { rankFromElo } from "./ranks";

const KEY = "poker-train.profile.v1";
const HAND_PREF_OPTIONS: HandsPreference[] = ["ANY", "PREFLOP", "OUTS", "FINAL"];

function normalizePreferredHands(value: unknown): HandsPreference {
  return HAND_PREF_OPTIONS.includes(value as HandsPreference) ? value as HandsPreference : "ANY";
}

export function defaultProfile(): PlayerProfile {
  const elo = 0;
  return {
    elo,
    rank: rankFromElo(elo),
    totalHands: 0,
    totalDecisions: 0,
    correctOutsCount: 0,
    lastPlayedISO: new Date().toISOString(),
    preferredHands: "ANY",
  };
}

export function loadProfile(): PlayerProfile {
  if (typeof window === "undefined") return defaultProfile();
  const raw = localStorage.getItem(KEY);
  if (!raw) return defaultProfile();
  try {
    const parsed = JSON.parse(raw) as PlayerProfile;
    // harden
    parsed.elo = Math.max(0, parsed.elo ?? 0);
    parsed.rank = rankFromElo(parsed.elo);
    parsed.preferredHands = normalizePreferredHands(parsed.preferredHands);
    return parsed;
  } catch {
    return defaultProfile();
  }
}

export function saveProfile(p: PlayerProfile) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(p));
}

export function resetProfile() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY);
}
