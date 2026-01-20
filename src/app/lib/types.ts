export type Suit = "s" | "h" | "d" | "c";
export type Rank =
  | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K" | "A";

export type Card = { r: Rank; s: Suit };

export type Street = "PREFLOP" | "FLOP" | "TURN" | "RIVER";

export type PlayerAction = "FOLD" | "CALL" | "RAISE";

export type OpponentAction = "FOLD" | "CALL" | "RAISE" | "CHECK" | "BET";

export type RankName =
  | "Bronze" | "Silver" | "Gold" | "Diamond" | "Mythic" | "Legendary" | "Champion";

export type CoachResponse = {
  score: number; // 0-100
  verdict: "good" | "neutral" | "bad";
  bestAction: "fold" | "call" | "raise";
  bestRaiseSizeBb: number | null;
  reasons: string[];
  conceptTags: string[];
  coachSummary: string;
};

export type TrainingState = {
  heroHand: [Card, Card];
  board: {
    flop: [Card, Card, Card] | null;
    turn: Card | null;
    river: Card | null;
  };
  street: Street;

  // Simplified table context
  heroPos: "BTN" | "CO" | "HJ" | "UTG";
  villainPos: "BB" | "SB" | "MP";

  effectiveStackBb: number; // default 100
  potBb: number;
  facing: { type: "BET" | "RAISE"; sizeBb: number } | null;

  // Opponent actions this street (3 opponents)
  opponentActions: Array<{
    name: "OppA" | "OppB" | "OppC";
    action: OpponentAction;
    sizeBb?: number;
  }>;

  // Optional deterministic math coaching
  outsInfo?: {
    correctOuts: number;
    equityApproxPct: number; // rule of 2/4
    drawLabel: string;       // "Flush draw", "OESD", "Gutshot", "Combo draw", etc.
  };
};

export type PlayerProfile = {
  elo: number;
  rank: RankName;
  totalHands: number;
  totalDecisions: number;
  correctOutsCount: number;
  lastPlayedISO: string;

  // last session (nice UX)
  lastCoachScore?: number;
};
