/**
 * Core types shared by every layer.
 *
 * These are plain data shapes with no behaviour so the domain logic, the API
 * route, the React hooks and the tests all agree on the same vocabulary.
 */

export type Suit = "s" | "h" | "d" | "c";
export type Rank =
  | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K" | "A";

export type Card = { r: Rank; s: Suit };

export type Street = "PREFLOP" | "FLOP" | "TURN" | "RIVER";

export type PlayerAction = "FOLD" | "CALL" | "RAISE";

/**
 * HANDS: one decision per spot. HANDS_PLUS ("Playthrough"): the hand continues
 * street by street with animated opponents and a showdown. GAME ("Full Game"):
 * like Playthrough but every hand starts preflop with a smaller pot.
 */
export type GameMode = "HANDS" | "HANDS_PLUS" | "GAME";

/** Which streets a Hands-mode spot may start on. Only Hands mode honours it. */
export type HandsPreference = "ANY" | "PREFLOP" | "OUTS" | "FINAL";

export type OpponentAction = "FOLD" | "CALL" | "RAISE" | "CHECK" | "BET";

export type RankName =
  | "Bronze" | "Silver" | "Gold" | "Diamond" | "Mythic" | "Legendary" | "Champion";

export type HeroPosition = "BTN" | "CO" | "HJ" | "UTG";
export type VillainPosition = "BB" | "SB" | "MP";
export type TablePosition = HeroPosition | VillainPosition;

export type OpponentName = "OppA" | "OppB" | "OppC";

export type CoachVerdict = "perfect" | "great" | "good" | "neutral" | "not-ideal" | "bad";
export type CoachAction = "fold" | "call" | "raise";

export type CoachResponse = {
  score: number; // 0-100
  verdict: CoachVerdict;
  bestAction: CoachAction;
  bestRaiseSizeBb: number | null;
  reasons: string[];
  conceptTags: string[];
  coachSummary: string;
};

/** The community cards as far as they have been dealt. */
export type BoardView = {
  flop: [Card, Card, Card] | null;
  turn: Card | null;
  river: Card | null;
};

/** Every community card, dealt up front so a playthrough can reveal them later. */
export type FullBoard = {
  flop: [Card, Card, Card];
  turn: Card;
  river: Card;
};

export type FacingBet = { type: "BET" | "RAISE"; sizeBb: number };

export type OpponentActionRecord = {
  name: OpponentName;
  action: OpponentAction;
  sizeBb?: number;
};

export type OpponentHand = { name: OpponentName; hand: [Card, Card] };

/** Deterministic outs coaching attached to a spot when a draw is present. */
export type OutsInfo = {
  correctOuts: number;
  equityApproxPct: number; // rule of 2/4
  drawLabel: string;       // "Flush draw", "OESD", "Gutshot", "Combo draw", etc.
};

/**
 * One training spot as the player sees it.
 *
 * `fullBoard` and `opponentHands` are dealt when the spot is generated but are
 * only shown in the playthrough modes, at showdown. Keeping them on the state
 * means a hand can be replayed to the river without re-dealing.
 */
export type TrainingState = {
  heroHand: [Card, Card];
  board: BoardView;
  street: Street;

  // Simplified table context
  heroPos: HeroPosition;
  villainPos: VillainPosition;

  effectiveStackBb: number; // default 100
  potBb: number;
  facing: FacingBet | null;
  fullBoard?: FullBoard;
  opponentHands?: OpponentHand[];

  // Opponent actions this street (3 opponents)
  opponentActions: OpponentActionRecord[];

  outsInfo?: OutsInfo;
};

export type PlayerProfile = {
  elo: number;
  rank: RankName;
  totalHands: number;
  totalDecisions: number;
  correctOutsCount: number;
  lastPlayedISO: string;
  preferredHands: HandsPreference;

  // last session (nice UX)
  lastCoachScore?: number;
};
