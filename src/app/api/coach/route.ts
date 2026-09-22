import { NextResponse } from "next/server";
import type { PlayerAction, TrainingState } from "@/domain/types";
import { evaluateDecision } from "@/domain/coach";

type ReqBody = {
  state: TrainingState;
  heroAction: PlayerAction;
  raiseSizeBb?: number | null;
  outsAnswer?: number | null;
};

/**
 * Grades a decision. The engine is deterministic and lives in
 * src/domain/coach; this route only parses the body and returns JSON.
 * `outsAnswer` is accepted for compatibility with the client but the
 * grader does not use it.
 */
export async function POST(req: Request) {
  const body = (await req.json()) as ReqBody;
  const { state, heroAction, raiseSizeBb } = body;

  const out = evaluateDecision(state, heroAction, raiseSizeBb ?? null);
  return NextResponse.json(out);
}
