# Quiz editing & version pinning

Quiz editing lets an owner change a quiz — its metadata **and** its question line-up —
without ever corrupting a game that someone is playing at that moment, and without ever
losing answer history. The mechanism is **copy-on-write versioning of the quiz⇄question
join rows**, with every play session **pinned to the quiz version it started on**.

## The problem this solves

Two things used to make editing unsafe:

1. **Hard-deleting join rows broke history.** The old update path deleted every
   `QuizQuestion` row and re-inserted the new set. But `UserAnswer.QuizQuestionId` and
   `QuizSession.CurrentQuizQuestionId` both FK to `QuizQuestion` with `Restrict`, so
   editing any quiz that had *ever* been played threw an FK violation.
2. **Sessions read the question list live.** `QuizSessionService` re-read
   `Quiz.QuizQuestions` on every "next question" call, so an edit mid-game silently
   changed an in-flight player's remaining questions, their order, points and timing —
   and could strand the session entirely.

## The design in one paragraph

`QuizQuestion` rows are **immutable once created**: an edit never updates a live row's
gameplay fields and never deletes a row. Instead each row carries a version range —
`CreatedInVersion` (the `Quiz.Version` it appeared in) and `RemovedInVersion` (the
version it was retired in; `null` = still part of the current quiz). Every
`QuizSession` stamps `QuizVersion = Quiz.Version` at start and is only ever served rows
whose range covers that version. So an in-flight player finishes **exactly** the quiz
they started — same questions, same order, same points, same time limits — while new
sessions pick up the edit immediately. This is the same snapshot semantic Kahoot-style
tools use.

## Data model

| Field | Where | Meaning |
|---|---|---|
| `Version` | `Quiz` | Monotonic edit counter; bumped by every update (and by status changes). Also the optimistic-concurrency token. |
| `CreatedInVersion` | `QuizQuestion` | Quiz version this row first appeared in. |
| `RemovedInVersion` | `QuizQuestion` | Quiz version this row was retired in. `null` = live (current content). |
| `QuizVersion` | `QuizSession` | The quiz version pinned at session start. |

A row is **visible to** a session at version `v` when
`CreatedInVersion <= v && (RemovedInVersion == null || RemovedInVersion > v)`
(`QuizQuestion.IsVisibleToVersion`). A row is part of the quiz's **current** content
when `RemovedInVersion == null` (`QuizQuestion.IsLive`).

The former unique `(QuizId, QuestionId)` index is now **filtered to live rows**
(`RemovedInVersion IS NULL`) — a question removed and later re-added legitimately has
two rows across versions, but only one live one at a time.

Note this versions the quiz's **use** of a question (membership, order, points, time
limit) — not the question's own content. `QuestionBase` rows are shared across quizzes
and are neither duplicated nor deleted by quiz editing; removing a question from a quiz
only retires the join row, exactly as intended.

## The edit flow (`PUT /api/quiz` → `QuizService.UpdateQuizAsync`)

1. Load the quiz with its **live** join rows (owner-only; 404 otherwise).
2. **Optimistic concurrency:** if the submitted `version` doesn't match
   `Quiz.Version`, return **409** — the client editing a stale copy must reload.
   This protects editor-vs-editor (two tabs, two devices).
3. Validate references and question ids, then apply metadata changes.
4. Diff the live rows against the incoming question list
   (`QuizQuestionVersioning.Diff` — pure, unit-tested, no EF):
   - **removed** question → stamp `RemovedInVersion = newVersion`;
   - **changed** settings/order → stamp the old row *and* insert a replacement
     (copy-on-write) with `CreatedInVersion = newVersion`;
   - **added** question → insert with `CreatedInVersion = newVersion`;
   - **untouched** → leave the row alone.
   Incoming order is normalised server-side to `1..n` by relative position, same as
   create. Duplicate question ids are rejected.
5. `Quiz.Version = newVersion`, save, commit — all inside one transaction.

Nothing is ever hard-deleted, so `RemoveQuizQuestions` was deleted from
`IQuizRepository`; its absence is deliberate.

## Session pinning (editor-vs-player)

`QuizVersion` is stamped in `CreateSessionAsync` and `CreateGuestSessionAsync`, and the
pinned-view filter is applied everywhere a session derives anything from the question
list:

- `QuizSessionService.GetNextQuestionAsync` — next unanswered question;
- `QuizSessionService.ResolveAndResumeAsync` — the "mathematical catch-up" resume;
- `SubmitAnswerService.CheckAndCompleteQuizAsync` — the completion check (an unpinned
  count would either complete early after a removal or become impossible to satisfy
  after an addition);
- `SessionAbandonmentService` — timeout math (shared by the lazy paths and the
  `abandoned-session-sweep` Hangfire job);
- the session DTO mappers' `TotalQuestions` (results/progress screens) and
  `ResumeState.PendingQuestions` (the resume screen's live countdown —
  [`session-resume-screen.md`](./session-resume-screen.md)).

**Multiplayer** needs no pin: `MatchOrchestrator.LoadRoundQuestionsAsync` loads the
(live) question rows once at match start into in-memory `RoundQuestion`s and never
re-reads the database mid-match — an implicit snapshot with the same behaviour.

Everything that is *not* a session — the editor, quiz detail/catalogue counts, the
`GET /quiz/{id}/questions` endpoint, CSV export, per-question analytics, question-usage
reports — filters to **live rows only**.

## What players experience

| Scenario | Result |
|---|---|
| Owner edits while a player is mid-quiz | Player finishes the version they started; nothing shifts under them. Their results page shows that version's question count and scoring. |
| Player starts after the edit | Gets the new version. |
| Owner removes a question that was already answered in an old session | Fine — the answer keeps pointing at the retired row (text, points, time limit preserved). |
| Two owners/tabs edit simultaneously | Second save gets **409** with a "quiz was modified" message and must reload. |
| Owner edits question **content** (text/answer options) via the question editor | **Not** pinned — question content is shared and unversioned; see known-issues. |

## Frontend

- `api/update-quiz.ts` — `useUpdateQuiz` (PUT `/quiz`), schema =
  `createQuizInputSchema` + `id` + `version`; invalidates the `quiz`/`quizzes`/
  `myQuizzes`/`quizQuestions` query families; exports `isVersionConflictError` for 409.
- `components/Create-Quiz-Form/edit-quiz.tsx` — `EditQuizRoute`, mounted at
  `/dashboard/quizzes/edit-quiz/:quizId` **and** `/my-dashboard/quizzes/edit/:quizId`: loads
  the quiz + its live questions, then reuses the create form in edit mode. An Associations quiz
  that lands here is redirected to its board editor. The provider is keyed by `id-vVersion` so a
  refetch re-seeds cleanly.
- `Quiz-questions-context.tsx` — the provider accepts `initialQuestions`
  (question + per-question settings) to seed edit mode.
- `create-quiz.tsx` — optional `editQuiz` prop: prefills all fields (including image),
  switches the submit to the update mutation, sends the loaded `version`, shows
  "Save Changes", and maps 409 to a "quiz changed elsewhere — reload" notification.
- Entry points: the quiz detail page's **Edit Quiz** buttons (previously disabled) and
  an **Edit** action in the quiz table. **Every Edit link is built by `quizEditPath` /
  `useQuizEditPath`** (`quiz-paths.ts`), which picks the format's editor and stays in the
  dashboard the table is shown in.

### Owners edit from their own dashboard

**Who can edit a quiz: its owner, and nobody else** — the API (`UpdateQuizAsync`) saves only
for the quiz's owner, admins included; there is no "edit any quiz" path.

Until 2026-09-23 the UI didn't match that. The editor was mounted only under `/dashboard`, whose
loader 404s everyone but admins, and "My quizzes" reused the admin table's Edit link — so a player
could create a quiz and never change it, and only an admin editing their *own* quiz could actually
save. The player dashboard now mounts the same editors at `/my-dashboard/quizzes/edit/:quizId`
(and `…/board`), inside its full-width paths, and the shared table links there when it is shown in
"My quizzes". The table's **View** item is hidden in "My quizzes": the single-quiz page is still
admin-only (`known-issues.md`).

## Migration

`20260702170817_QuizEditingVersioning` (applied on startup like every migration). Besides the new
columns it does two things worth knowing if you ever touch it:

- **Backfills existing sessions** to their quiz's current version
  (`UPDATE "QuizSessions" … SET "QuizVersion" = q."Version"`). The column's default of 1 is only
  right for join rows; a session of a quiz already past version 1 must not claim to have started
  on version 1.
- **Swaps the `(QuizId, QuestionId)` unique index for the filtered one**
  (`WHERE "RemovedInVersion" IS NULL`), so a question removed and re-added can have two rows across
  versions but only one live one.

(This section used to say the migration was "not yet generated" and give the commands to write
it; it has long since been generated and contains both.)

## Associations Boards follow the same rule

An Associations quiz has no `QuizQuestion` rows; its content is one **Board**, versioned the same
way — never updated in place, retired with `RemovedInVersion` and replaced at the new version when
its content changes, left alone when only metadata changes. See
[`associations.md`](./associations.md) §8.2.

## Growth & cleanup

Retired rows are tiny and only accumulate when a quiz is actually edited. If it ever
matters, rows with `RemovedInVersion <= min(active session QuizVersion)` and no
`UserAnswer` references are safe to purge with a background job — deliberately not
built now.

## Tests

`QuizAPI.Tests/Editing/QuizQuestionVersioningTests.cs` covers the diff (retire vs
insert vs untouched, copy-on-write on every settings change, order normalisation,
duplicate rejection, retired-row re-adds) and the visibility rule, including an
end-to-end simulation of "owner edits while a session is pinned to v1".
