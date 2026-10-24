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

## Catalogue

**Picked quiz**:
A `Public` quiz an admin has picked for the main catalogue — house quizzes automatically, and
community quizzes chosen for quality (`Quiz.IsPicked`). See
[`moderation.md`](../media/moderation.md) §5.
_Avoid_: official quiz (the first name for it; excludes good user quizzes), featured (suggests a
temporary highlight), approved or verified (imply fact-checking), Oxygen Pick (that is the badge's
display text, and the brand may change)

**Community quiz**:
A `Public` quiz that isn't picked — written by a user and not reviewed.
_Avoid_: user quiz (a picked quiz can be a user's too), public quiz (a picked quiz is Public too),
unofficial quiz

**House quiz**:
A quiz made by staff (an Admin or SuperAdmin; `Quiz.IsHouse`), picked automatically at creation and
shown without a badge.
_Avoid_: official quiz

**Held quiz**:
A quiz a moderator (or 10 reporters) took out of sight pending review (`Quiz.ModerationHeldAt`):
out of the catalogue, playable by its owner only. Not a `Status` — the owner can't undo it.
_Avoid_: hidden quiz, banned quiz, unpublished (that is the owner's Draft)

## Reports

**Report**:
A signed-in player's complaint about a question or quiz (`ContentReport`) — a wrong answer, an
inappropriate image, offence, spam, copyright. See [`moderation.md`](../media/moderation.md).
_Avoid_: flag, complaint; and never for the owner's statistics, which are the **Statistics export**

**Hidden media**:
A question's image or clip under a moderation cover (`Question.MediaHiddenAt`); the question still
plays, and signed-in players can choose *Show anyway*.
_Avoid_: hidden question (a question is never hidden)

## Pages about one quiz

**Quiz listing**:
The public page for one Public quiz, at `/q/:id/:slug` — title, description, the facts and a Play
button, the same for every visitor. It exists for search engines and for links to a Public quiz;
the catalogue still opens the start modal. See [`quiz-listing.md`](./quiz-listing.md).
_Avoid_: quiz page (ambiguous with the Single-quiz page), landing page, quiz detail page, public
quiz page

**Single-quiz page**:
The owner's and admins' page for one quiz — its stats, questions and actions — at
`/my-dashboard/quiz/:id` and `/dashboard/quiz/:id`. See
[`quiz-analytics-page.md`](./quiz-analytics-page.md).
_Avoid_: quiz page, quiz view, analytics page (fine in prose for what the page shows)

**Start modal**:
The dialog a catalogue card opens to read a quiz before playing it (`quiz-start-modal.tsx`).
_Avoid_: quiz preview (a link preview is the card a chat app draws), quiz details dialog

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

## Classroom

Words for teachers playing Associations with a class. Being settled in
[`classroom-plan.md`](./classroom-plan.md) and [`classroom.md`](./classroom.md); a term here is decided, the behaviour may not be built yet.

**Teacher**:
A role, alongside `User`, `Admin` and `SuperAdmin`, that lets an account host a board for a class
and save Classes.
_Avoid_: instructor, educator, host (the Host is what a Teacher does, not who they are)

**Host** (verb):
To run a Board on one screen in front of a class, the Teacher making every move on the Teams'
behalf.
_Avoid_: present, run, moderate

**Host mode**:
The way of playing a Board where one Teacher hosts it for several Teams taking turns on one shared
Board, on one screen. Nobody else joins.
_Avoid_: teacher mode, manual mode, offline mode

**Live classroom**:
The later way of playing where students join on their own devices, in Teams, and the Teacher
watches. Not built yet.
_Avoid_: classroom mode (ambiguous with Host mode), lobby (a Lobby is the multiplayer room)

**Class**:
A Teacher's saved, named list of students — first names only, not accounts — that Teams are formed
from.
_Avoid_: classroom (the room), group, roster (fine in prose)

**Team**:
The students who play together and take one Seat in a hosted game.
_Avoid_: group (ambiguous next to Column), squad, side

**Captain**:
The one member of a Team who submits its moves. Meaningful only in a Live classroom.
_Avoid_: leader, team lead

**Controller**:
The Teacher's signed-in device in Host mode — phone or laptop — where every move is made. Without a
Display it is also the screen the class sees.
_Avoid_: remote, host screen, admin view

**Display**:
A read-only screen showing a hosted game to the class, connected by a Screen code. It needs no
login and only ever shows what the room may see.
_Avoid_: projector view, student screen, viewer, spectator

**Screen code**:
The short code a Controller hands out so a Display can connect to its game.
_Avoid_: join code, invite code (an invite code grants an account a role), PIN

**Answer key**:
The board's solutions, shown on the Controller one tap at a time — and only while a Display is
connected, so the Controller isn't the projected screen.
_Avoid_: cheat sheet, solutions view

**Undo**:
The Teacher taking back the most recent move of a hosted game. It is itself recorded, so a review
shows it happened.
_Avoid_: revert, rollback, delete move
