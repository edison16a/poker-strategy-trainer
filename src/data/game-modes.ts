import modesRaw from "./game-modes.json";
import prefsRaw from "./hand-preferences.json";
import type { GameMode, HandsPreference, Street } from "@/domain/types";

/**
 * Per-mode settings.
 *
 * `startingStreets` is either an explicit list of streets a hand can start on
 * or the string "preference", meaning the player's Hands preference decides.
 * Hands mode is the only one that honours the preference, which is why the
 * indirection exists instead of a plain list.
 */
export type GameModeConfig = {
  label: string;
  /** Text on the header button that deals the next spot. */
  nextLabel: string;
  startingStreets: Street[] | "preference";
  /** Pot size range before any opponent bet, in big blinds. */
  startingPotBb: { min: number; max: number };
};

export type HandsPreferenceOption = {
  value: HandsPreference;
  label: string;
  desc: string;
  /** Streets a Hands-mode spot may start on under this preference. */
  streets: Street[];
};

/** Display order of the mode toggle. */
export const GAME_MODE_ORDER = modesRaw.order as GameMode[];

export const GAME_MODES = modesRaw.modes as Record<GameMode, GameModeConfig>;

export const DEFAULT_HANDS_PREFERENCE = prefsRaw.default as HandsPreference;

export const HAND_PREFERENCE_OPTIONS = prefsRaw.options as HandsPreferenceOption[];

/** Fast lookup by value; falls back to the default option for unknown input. */
export function handPreferenceOption(value: HandsPreference): HandsPreferenceOption {
  return HAND_PREFERENCE_OPTIONS.find(o => o.value === value) ?? HAND_PREFERENCE_OPTIONS[0];
}
