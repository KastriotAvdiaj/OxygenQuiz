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
- `SessionAbandonmentService` / `QuizSessionCleanupService` — timeout math;
- the session DTO mappers' `TotalQuestions` (results/progress screens).

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
- `components/Create-Quiz-Form/edit-quiz.tsx` — `EditQuizRoute`
  (`/dashboard/quizzes/edit-quiz/:quizId`): loads the quiz + its live questions, then
  reuses the create form in edit mode. The provider is keyed by `id-vVersion` so a
  refetch re-seeds cleanly.
- `Quiz-questions-context.tsx` — the provider accepts `initialQuestions`
  (question + per-question settings) to seed edit mode.
- `create-quiz.tsx` — optional `editQuiz` prop: prefills all fields (including image),
  switches the submit to the update mutation, sends the loaded `version`, shows
  "Save Changes", and maps 409 to a "quiz changed elsewhere — reload" notification.
- Entry points: the quiz detail page's **Edit Quiz** buttons (previously disabled) and
  an **Edit** action in the dashboard quiz table.

## Migration (run on your machine — not yet generated)

```bash
cd OxygenBackend/QuizAPI
dotnet ef migrations add QuizEditingVersioning
```

Then, inside the generated migration's `Up()`, after the column additions, backfill
existing sessions to their quiz's current version (new columns default correctly for
join rows — `CreatedInVersion = 1` — but pre-existing sessions of quizzes already at
`Version > 1` must not default to 1):

```csharp
migrationBuilder.Sql("""
    UPDATE "QuizSessions" s
    SET    "QuizVersion" = q."Version"
    FROM   "Quizzes" q
    WHERE  s."QuizId" = q."Id";
""");
```

The migration also swaps the `(QuizId, QuestionId)` unique index for the filtered one —
verify the generated migration contains the `HasFilter`/`IS NULL` variant.

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
