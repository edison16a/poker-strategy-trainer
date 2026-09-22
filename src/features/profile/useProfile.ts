"use client";

import { useEffect, useState } from "react";
import type { PlayerProfile } from "@/domain/types";
import { loadProfile, saveProfile } from "./storage";

/**
 * The player's profile, loaded from localStorage after mount (so the server
 * render and the first client render match) and written back on every
 * change. `profile` is null until the load effect has run.
 */
export function useProfile() {
  const [profile, setProfile] = useState<PlayerProfile | null>(null);

  useEffect(() => {
    // Reading localStorage must wait for the client, so the server render and
    // the first client render both see null. That makes this the one place a
    // setState in an effect is the right tool.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProfile(loadProfile());
  }, []);

  useEffect(() => {
    if (profile) saveProfile(profile);
  }, [profile]);

  return { profile, setProfile } as const;
}
