import type { HandsPreference, PlayerProfile } from "@/domain/types";
import { rankFromElo } from "@/domain/ranks";
import { DEFAULT_HANDS_PREFERENCE, HAND_PREFERENCE_OPTIONS } from "@/data/game-modes";
import { UI } from "@/data/ui";

const KEY = UI.profileStorageKey;

function normalizePreferredHands(value: unknown): HandsPreference {
  return HAND_PREFERENCE_OPTIONS.some(o => o.value === value) ? (value as HandsPreference) : DEFAULT_HANDS_PREFERENCE;
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
    preferredHands: DEFAULT_HANDS_PREFERENCE,
  };
}

/**
 * Reads the profile from localStorage, or a fresh one on the server, when
 * nothing is stored, or when the stored JSON is unreadable.
 *
 * Stored values are hardened rather than trusted: Elo is clamped to zero or
 * above, the rank is recomputed from Elo (older saves may predate a ladder
 * change), and an unknown hand preference falls back to the default.
 */
export function loadProfile(): PlayerProfile {
  if (typeof window === "undefined") return defaultProfile();
  const raw = localStorage.getItem(KEY);
  if (!raw) return defaultProfile();
  try {
    const parsed = JSON.parse(raw) as PlayerProfile;
    parsed.elo = Math.max(0, parsed.elo ?? 0);
    parsed.rank = rankFromElo(parsed.elo);
    parsed.preferredHands = normalizePreferredHands(parsed.preferredHands);
    return parsed;
  } catch {
    return defaultProfile();
  }
}

export function saveProfile(p: PlayerProfile): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(p));
}

export function resetProfile(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY);
}
