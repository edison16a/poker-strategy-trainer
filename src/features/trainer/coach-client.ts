import type { CoachResponse, PlayerAction, TrainingState } from "@/domain/types";
import { UI } from "@/data/ui";

export type CoachRequest = {
  state: TrainingState;
  heroAction: PlayerAction;
  raiseSizeBb?: number | null;
  outsAnswer?: number | null;
};

/**
 * Posts a decision to the coach route. Grading is deterministic and could
 * run in the browser, but it stays behind the API so the engine and its
 * tuning are not shipped to the client; that is the existing design.
 */
export async function requestCoachFeedback(body: CoachRequest): Promise<CoachResponse> {
  const res = await fetch(UI.coachEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(t || `HTTP ${res.status}`);
  }

  return (await res.json()) as CoachResponse;
}
