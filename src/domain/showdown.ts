import type { BoardView, Card, FullBoard, PlayerAction } from "./types";
import { boardCardsFromView, cardToString } from "./cards";
import { fullBoardCards } from "./board";
import { bestHands, evaluateHand, type HandEval } from "./hand-eval";
import { fmt } from "./text";
import { COPY } from "@/data/copy";

export type PlayerShowdown = {
  id: string;
  name: string;
  isHero: boolean;
  hand: [Card, Card];
  evaluation: HandEval;
};

/**
 * Outcome of running a spot to the river.
 *
 * `winners` is the best hand if the hero had stayed in, `activeWinners` is
 * who actually takes the pot (the hero is excluded when folded). Both are
 * kept so the UI can say "you folded, but you would have won".
 */
export type ShowdownResult = {
  finalBoard: FullBoard;
  players: PlayerShowdown[];
  winners: PlayerShowdown[];
  activeWinners: PlayerShowdown[];
  heroWouldResult: "win" | "lose" | "chop";
  heroFolded: boolean;
  heroAction: PlayerAction;
  decisionBoard: BoardView;
  heroAheadAtDecision: boolean;
  runoutNote: string;
  runoutDetail: string;
};

export type ShowdownInput = {
  heroHand: [Card, Card];
  opponents: Array<{ name: string; hand: [Card, Card] }>;
  board: FullBoard;
  heroFolded: boolean;
  heroAction: PlayerAction;
  decisionBoard: BoardView;
};

/**
 * "You" for the hero, "Opp 1" for "OppA" (letters map to numbers so the
 * showdown text matches the seat labels on the table), otherwise the raw name.
 */
export function formatDisplayName(p: { name: string; isHero: boolean }): string {
  if (p.isHero) return COPY.showdown.you;
  const m = p.name.match(/Opp ?([A-Z])/);
  if (m) {
    const idx = m[1].charCodeAt(0) - 64; // A=1
    return fmt(COPY.showdown.opponent, { n: idx });
  }
  const n = p.name.match(/Opp ?(\d)/);
  if (n) return fmt(COPY.showdown.opponent, { n: n[1] });
  return p.name;
}

function evaluatePlayers(
  heroHand: [Card, Card],
  opponents: ShowdownInput["opponents"],
  communityCards: Card[],
): PlayerShowdown[] {
  return [
    {
      id: "hero",
      name: COPY.showdown.you,
      isHero: true,
      hand: heroHand,
      evaluation: evaluateHand([...heroHand, ...communityCards]),
    },
    ...opponents.map((opp, idx) => ({
      id: opp.name ?? `opp-${idx}`,
      name: opp.name ?? fmt(COPY.showdown.opponent, { n: idx + 1 }),
      isHero: false,
      hand: opp.hand,
      evaluation: evaluateHand([...opp.hand, ...communityCards]),
    })),
  ];
}

function formatBoard(b: BoardView): string {
  return boardCardsFromView(b).map(cardToString).join(" ");
}

/** Evaluates every hand on the full board and on the decision board, and writes the narrative. */
export function resolveShowdown({
  heroHand,
  opponents,
  board,
  heroFolded,
  heroAction,
  decisionBoard,
}: ShowdownInput): ShowdownResult {
  const notes = COPY.showdown.notes;
  const detailCopy = COPY.showdown.detail;

  const players = evaluatePlayers(heroHand, opponents, fullBoardCards(board));

  const winners = bestHands(players);
  const heroIsWinner = winners.some(w => w.isHero);
  const heroWouldResult = heroIsWinner ? (winners.length > 1 ? "chop" : "win") : "lose";

  const activePlayers = heroFolded ? players.filter(p => !p.isHero) : players;
  const activeWinners = bestHands(activePlayers);

  const decisionPlayers = evaluatePlayers(heroHand, opponents, boardCardsFromView(decisionBoard));
  const decisionBest = bestHands(decisionPlayers);
  const heroAheadAtDecision = decisionBest.some(p => p.isHero);
  const decisionVillain = decisionBest.find(p => !p.isHero);
  const showdownVillain = winners.find(w => !w.isHero);

  let runoutNote = "";
  if (heroFolded) {
    runoutNote = heroAheadAtDecision ? notes.foldedAhead : notes.foldedBehind;
  } else if (heroAheadAtDecision && heroWouldResult === "lose") {
    runoutNote = notes.outdrawn;
  } else if (!heroAheadAtDecision && heroWouldResult === "win") {
    runoutNote = notes.improved;
  } else if (heroWouldResult === "chop") {
    runoutNote = heroAheadAtDecision ? notes.chopAhead : notes.chopBehind;
  } else if (heroAheadAtDecision) {
    runoutNote = notes.heldUp;
  } else {
    runoutNote = notes.behind;
  }

  const heroHandStr = heroHand.map(cardToString).join(" ");
  const decisionBoardStr = formatBoard(decisionBoard);
  const finalBoardStr = formatBoard(board);
  const decisionOppDesc = decisionVillain
    ? `${decisionVillain.name} (${decisionVillain.evaluation.label})`
    : COPY.showdown.opponents;
  const showdownOppDesc = showdownVillain
    ? `${formatDisplayName(showdownVillain)} (${showdownVillain.evaluation.label})`
    : COPY.showdown.opponents;

  const describe = (p: PlayerShowdown) => `${formatDisplayName(p)} (${p.evaluation.label})`;
  const decisionBestStr = decisionBest.map(describe).join(", ");
  const showdownBestStr = winners.map(describe).join(", ");

  let runoutDetail = fmt(detailCopy.held, {
    hand: heroHandStr,
    board: decisionBoardStr || detailCopy.noBoard,
    best: decisionBestStr,
  });
  if (!heroFolded) {
    runoutDetail += fmt(detailCopy.final, { board: finalBoardStr, best: showdownBestStr });
    if (heroAheadAtDecision && heroWouldResult === "lose") {
      runoutDetail += fmt(detailCopy.outdrawnBy, { opp: showdownOppDesc });
    } else if (!heroAheadAtDecision && heroWouldResult === "win") {
      runoutDetail += fmt(detailCopy.improvedOver, { opp: decisionOppDesc });
    }
  } else {
    runoutDetail += fmt(detailCopy.folded, { board: finalBoardStr });
  }

  return {
    finalBoard: board,
    players,
    winners,
    activeWinners,
    heroWouldResult,
    heroFolded,
    heroAction,
    decisionBoard,
    heroAheadAtDecision,
    runoutNote,
    runoutDetail,
  };
}
