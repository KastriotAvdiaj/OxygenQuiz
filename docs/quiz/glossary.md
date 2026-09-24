# Quiz glossary

The words this area uses, and the ones it deliberately doesn't. Behaviour lives in the feature
docs alongside this file; this is vocabulary only.

## Formats

**Quiz format**:
Which kind of game a `Quiz` is played as. Every quiz has exactly one, fixed at creation. See
[ADR 0018](../adr/0018-quiz-formats-are-separate-verticals.md).
_Avoid_: quiz type (collides with question type), game mode, mode (`QuizSessionMode` already means
single player vs multiplayer)

**Classic**:
The format made of an ordered list of questions, each answered once — everything the app played
before formats existed.
_Avoid_: normal quiz, basic quiz, standard quiz

**Associations**:
The format played on a single Board, modelled on the final of the TV show *Oxygen*.
_Avoid_: Asocijacije, association quiz, connections

## Associations

**Board**:
The content of an Associations quiz: four Columns and one Final solution.
_Avoid_: grid, puzzle, round

**Column**:
One of the Board's four lettered groups (A–D): four Tiles and one Column solution.
_Avoid_: row, group, category (a `QuestionCategory` is a lookup)

**Tile**:
One hidden clue in a Column, opened during play.
_Avoid_: clue (fine in prose for what is written *on* a tile), field, card, cell

**Column solution**:
The word or phrase that links a Column's four Tiles — the column's "main tile".
_Avoid_: column answer, main tile (in code and docs)

**Final solution**:
The word or phrase that links the four Column solutions.
_Avoid_: final answer, main answer

**Guess**:
A player's typed attempt at one Column solution or at the Final solution.
_Avoid_: answer, submission — both already name classic concepts (`UserAnswer`,
`SubmittedAnswer`)

**Solo**:
An Associations game played by one player against a board timer.
_Avoid_: single player (that is `QuizSessionMode.SinglePlayer`, which a Duel's sessions are not)

**Duel**:
An Associations game played by two players taking turns on one shared Board — the show's final.
_Avoid_: 1v1 (in code and docs), versus, final (the Final solution is something else)

**Endgame**:
The last phase of a Duel, once every Tile is open: each player gets a fixed number of guess-only
turns before the game ends.
_Avoid_: overtime, sudden death

**Seat**:
One side of an Associations game — whoever takes a turn. A Duel has two; Solo has one. A Seat is
not a user: a future team game puts two players on one Seat.
_Avoid_: player (in the engine), side, slot

**Move**:
One recorded thing a Seat did in an Associations game — open a Tile, Guess, Pass, give up — or the
server's record that a turn ran out. The move log is what a game is replayed from.
_Avoid_: action, event (SignalR events are what announce moves), turn (a turn contains moves)

**Game**:
One Board being played — by one player (Solo) or by two taking turns (Duel). Stored as a header
(`AssociationGame`) and its move log; its state is always rebuilt by replaying the moves
([ADR 0020](../adr/0020-an-associations-game-is-its-move-log.md)). Each player's side of it is an
ordinary quiz session.
_Avoid_: match (a Match is the multiplayer record a Duel belongs to), round
