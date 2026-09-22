import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { defaultProfile, loadProfile, resetProfile, saveProfile } from "@/features/profile/storage";
import { rankUpMessage, withElo, withEloDelta } from "@/features/profile/profile-updates";
import { UI } from "@/data/ui";

/** Minimal localStorage so the storage module believes it is in a browser. */
function fakeStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => { map.set(k, v); },
    removeItem: (k: string) => { map.delete(k); },
  };
}

describe("profile storage", () => {
  const g = globalThis as unknown as { window?: unknown; localStorage?: ReturnType<typeof fakeStorage> };

  beforeEach(() => {
    g.window = {};
    g.localStorage = fakeStorage();
  });
  afterEach(() => {
    delete g.window;
    delete g.localStorage;
  });

  it("returns a default profile when nothing is stored", () => {
    expect(loadProfile()).toMatchObject({ elo: 0, rank: "Bronze", totalHands: 0, preferredHands: "ANY" });
  });

  it("round-trips a saved profile", () => {
    const p = { ...defaultProfile(), elo: 3400, rank: "Gold" as const, totalHands: 12, preferredHands: "OUTS" as const };
    saveProfile(p);
    expect(loadProfile()).toEqual(p);
    resetProfile();
    expect(loadProfile().totalHands).toBe(0);
  });

  it("hardens stored values: negative Elo, stale rank, unknown preference", () => {
    g.localStorage!.setItem(UI.profileStorageKey, JSON.stringify({ elo: -40, rank: "Champion", preferredHands: "WHATEVER", totalHands: 3 }));
    expect(loadProfile()).toMatchObject({ elo: 0, rank: "Bronze", preferredHands: "ANY", totalHands: 3 });
    g.localStorage!.setItem(UI.profileStorageKey, JSON.stringify({ elo: 6000, rank: "Bronze" }));
    expect(loadProfile().rank).toBe("Diamond");
  });

  it("falls back to defaults on unreadable JSON", () => {
    g.localStorage!.setItem(UI.profileStorageKey, "{not json");
    expect(loadProfile().elo).toBe(0);
  });

  it("returns defaults and no-ops outside a browser", () => {
    delete g.window;
    expect(loadProfile().elo).toBe(0);
    expect(() => saveProfile(defaultProfile())).not.toThrow();
  });
});

describe("profile updates", () => {
  it("applies deltas with clamping and rank recompute", () => {
    const p = defaultProfile();
    expect(withEloDelta(p, -50, false).elo).toBe(0);
    const up = withEloDelta({ ...p, elo: 1480 }, 30, true);
    expect(up).toMatchObject({ elo: 1510, rank: "Silver" });
    expect(withElo(p, 15000)).toMatchObject({ elo: 15000, rank: "Champion" });
  });

  it("keeps the timestamp unless asked to touch it", () => {
    const p = { ...defaultProfile(), lastPlayedISO: "2000-01-01T00:00:00.000Z" };
    expect(withEloDelta(p, 10, false).lastPlayedISO).toBe(p.lastPlayedISO);
    expect(withEloDelta(p, 10, true).lastPlayedISO).not.toBe(p.lastPlayedISO);
  });

  it("writes the congratulation with the percentile", () => {
    expect(rankUpMessage("Gold")).toBe("🎉 Congrats! New rank: Gold (Top 25%).");
    expect(rankUpMessage("Champion")).toMatch(/reached Champion/);
  });
});
