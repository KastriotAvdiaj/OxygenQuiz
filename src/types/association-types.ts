// Associations format — the wire types: authoring (server: DTOs/Quiz/AssociationQuizDTOs.cs)
// and play (DTOs/Quiz/AssociationPlayDTOs.cs).
// Vocabulary: docs/quiz/glossary.md. Behaviour: docs/quiz/associations.md.

export const COLUMN_LETTERS = ["A", "B", "C", "D"] as const;
export type ColumnLetter = (typeof COLUMN_LETTERS)[number];

/** One Tile as the edit read returns it. `position` is 0–3 within its Column. */
export type AssociationTileDTO = {
  id: number;
  position: number;
  text: string;
};

export type AssociationColumnDTO = {
  letter: ColumnLetter;
  tiles: AssociationTileDTO[];
  solution: string;
  acceptableSolutions: string[];
};

/**
 * The full Board, solutions included — `GET /quiz/{id}/board`. The answer key, so the API
 * serves it to the quiz's owner or an admin only; anyone else gets 404.
 */
export type AssociationBoardDTO = {
  quizId: number;
  /** The quiz version this read reflects — sent back on save for the 409 check. */
  version: number;
  boardTimeInSeconds: number;
  columns: AssociationColumnDTO[];
  finalSolution: string;
  finalAcceptableSolutions: string[];
};

// ── Play (server: DTOs/Quiz/AssociationPlayDTOs.cs) ──────────────────────────
//
// A view, never the Board: a closed Tile has no `text`, an unsolved Column or Final has no
// `solution`, and other spellings are never sent. The server builds it (AssociationViews);
// the client only draws it. See docs/quiz/associations.md, "What the client sees".

export type GuessTarget = ColumnLetter | "Final";

export type AssociationEndReason =
  | "FinalSolved"
  | "TimeUp"
  | "GaveUp"
  | "EndgameOver"
  | "Forfeit"
  | "Abandoned"
  /** Host mode: the Teacher pressed End game (docs/quiz/classroom.md). */
  | "EndedByHost";

export type AssociationTileView = {
  id: number;
  position: number;
  isOpen: boolean;
  /** Only when open, or once the game is over. */
  text: string | null;
  /** The Seat that opened it by hand; null when a solve revealed it. */
  openedBySeat: number | null;
};

export type AssociationColumnView = {
  letter: ColumnLetter;
  tiles: AssociationTileView[];
  solved: boolean;
  /** Once solved — or, for every Column, once the game is over. */
  solution: string | null;
  points: number | null;
  solvedBySeat: number | null;
  /** Collected by a correct Final rather than guessed on its own. */
  viaFinal: boolean;
};

export type AssociationFinalView = {
  solved: boolean;
  solution: string | null;
  points: number | null;
  solvedBySeat: number | null;
};

export type AssociationMoveView = {
  seq: number;
  seat: number;
  kind: "OpenTile" | "Guess" | "Pass" | "TurnExpired" | "GiveUp" | "Undo";
  tileId: number | null;
  target: GuessTarget | null;
  guessText: string | null;
  isCorrect: boolean | null;
  points: number;
  at: string;
  /** Host mode, an Undo: the move it took back (ADR 0025). */
  cancelsSeq?: number | null;
};

export type AssociationGameView = {
  sessionId: string;
  quizId: number;
  quizTitle: string;
  playStyle: "Solo" | "Duel";
  isOver: boolean;
  endReason: AssociationEndReason | null;
  /** Starting found this player's game already running and returned it. */
  resumed: boolean;
  startedAt: string;
  endedAt: string | null;
  /** Solo: when the board timer runs out, on the server's clock. */
  deadlineUtc: string | null;
  /** The server's clock when the view was built — for correcting the client's. */
  serverNow: string;
  boardSeconds: number;
  score: number;
  /** A closed Tile is left to open. */
  canOpen: boolean;
  /** A Guess is earned: a Tile was opened, or the last Guess was right. */
  canGuess: boolean;
  /** Every Tile is open and a wrong Guess has been made since: tries are counting down. */
  inEndgame: boolean;
  /** In the endgame: wrong Guesses still allowed, the next one included. */
  endgameTriesLeft: number | null;
  /** The reader's Seat: 0 in Solo; 0 or 1 in a Duel. `score` is this Seat's. */
  mySeat: number;
  /** A Duel's Seats (names, scores). Empty for Solo. */
  seats: DuelSeat[];
  /** A Duel's winner; null on a tie, and for Solo. */
  winnerSeat: number | null;
  columns: AssociationColumnView[];
  final: AssociationFinalView;
  moves: AssociationMoveView[];
};

/** What the board component draws — shared by the Solo view and the Duel view. */
export type AssociationBoardView = Pick<AssociationGameView, "columns" | "final" | "isOver">;

export type AssociationMoveResult = {
  game: AssociationGameView;
  /** For a Guess; null for other moves, and when the board ran out before the move counted. */
  isCorrect: boolean | null;
  points: number;
  solvedColumns: ColumnLetter[];
  finalSolved: boolean;
};

// ── Duel (server: DuelViewDTO etc. in AssociationPlayDTOs.cs; docs/quiz/associations.md §10) ──
//
// Played over the lobby's SignalR connection. Both players get the same view — nothing in a Duel
// is private to one Seat — and every event carries all of it, so a missed event is repaired by
// the next one.

export type DuelSeat = {
  seat: number;
  username: string;
  score: number;
  /** In the endgame: turns this Seat has left after the one it may be taking. */
  endgameTurnsLeft?: number | null;
  /** This player's results page, once the Duel is over and recorded. */
  sessionId?: string | null;
};

export type DuelView = {
  quizId: number;
  quizTitle: string;
  seats: DuelSeat[];
  firstSeat: number;
  /** Whose turn it is; null once over. */
  currentSeat: number | null;
  /** The turn clock's deadline on the server's clock; null once over. */
  turnDeadlineUtc: string | null;
  serverNow: string;
  turnSeconds: number;
  /** What the Seat whose turn it is may do. */
  canOpen: boolean;
  canGuess: boolean;
  canPass: boolean;
  inEndgame: boolean;
  isOver: boolean;
  endReason: AssociationEndReason | null;
  winnerSeat: number | null;
  columns: AssociationColumnView[];
  final: AssociationFinalView;
  moves: AssociationMoveView[];
};

export type DuelUpdate = {
  /** Null when the server ended the Duel (a forfeit), which is not a move. */
  move: AssociationMoveView | null;
  isCorrect: boolean | null;
  points: number;
  view: DuelView;
};
