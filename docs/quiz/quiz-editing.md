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
| `UpdatedAt` | `Quiz` | When it last changed — every bump of `Version`, plus an edit to any question live in it (even from the question bank). The sitemap's `<lastmod>`; see [`quiz-listing.md`](quiz-listing.md). |
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

1. Load the quiz with its **live** join rows. The owner, or a caller with `quiz:update:any`
   (Admin as seeded, SuperAdmin always), may update; anyone else gets 404. Until 2026-10-21 this was owner-only, so an admin opening
   someone else's quiz got a full editor whose save always failed.
2. **Optimistic concurrency:** if the submitted `version` doesn't match
   `Quiz.Version`, return **409** — the client editing a stale copy must reload.
   This protects editor-vs-editor (two tabs, two devices).
3. Validate references and question ids, then apply metadata changes — including the quiz
   **image**, which until 2026-10-22 the update ignored (a changed image was silently lost).
   **A save that changes nothing is not a new version:** if no field (title, description,
   classification, status, options, image) differs and the question diff below is empty, the
   save returns the quiz as it is, version unchanged. Removing questions and putting them back
   with Undo, then saving, used to add a version on every save.
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

**Who can edit a quiz: its owner, or a caller with `quiz:update:any`** — Admin as seeded, the
SuperAdmin always ([`user-role-management.md`](../auth/user-role-management.md) §1.1). Until
2026-10-21 `UpdateQuizAsync` saved for the owner only, admins included, so an admin got a full
editor whose save always failed.

Until 2026-09-23 the UI didn't match that. The editor was mounted only under `/dashboard`, whose
loader 404s everyone but admins, and "My quizzes" reused the admin table's Edit link — so a player
could create a quiz and never change it, and only an admin editing their *own* quiz could actually
save. The player dashboard now mounts the same editors at `/my-dashboard/quizzes/edit/:quizId`
(and `…/board`), inside its full-width paths, and the shared table links there when it is shown in
"My quizzes". The table's **View** item is hidden in "My quizzes": the single-quiz page is still
admin-only (`known-issues.md`).

### Removing a question

Every removal — the desktop list's trash icon, the overview's card and editor, the question bank
picker — **asks first** ("Remove question N?") and can then be **undone**. The dialog says what
removal means: a saved question only leaves this quiz and stays in the question bank; a draft that
was never saved is thrown away.

Undo is a **stack** (`question-history.ts`, held by `QuizQuestionProvider`): remove three, press
Undo three times, and each comes back — newest first — at the position it left, with the points
and time limit it had. It only undoes removals. It lasts until the quiz is saved or the page is
left (the provider remounts). On the desktop the **Undo** button sits in the *Quiz Questions*
panel's header, with a count when there is more than one to walk back; on the overview it is in
the bottom bar with "Question N removed".

The confirmation and the stack live in the provider, not in each button, so all four places
behave the same: `requestRemoveQuestion(id, onRemoved?)` opens the dialog;
`removeQuestionFromQuiz` is the unconfirmed removal it calls and records.

**Don't ask again.** The dialog has a checkbox; ticking it turns off the user's
`AskBeforeRemovingQuestion` setting (server-side, so it holds on every device), and a toast says
where to turn it back on: **Settings › Quiz › Ask before removing a question**. With it off, a
removal happens at once — Undo still works, which is why it is safe to offer. The setting's PUT
field is nullable so an older client that doesn't send it can't reset it.

### Which questions the builder edits directly

**The rule set** (decided 2026-10-21, [ADR 0031](../adr/0031-the-builder-edits-a-saved-question-in-place-only-when-nothing-else-would-notice.md)).
Every question in the builder is one of these, and nothing else decides it:

| The question is… | In the builder | On save |
| --- | --- | --- |
| **A draft** — written here, or a copy | Editor | Created as a new question |
| **Saved, and** yours **and** in no other live quiz **and** never answered | Editor, no notice | Updated in place, only if its content changed |
| **Saved, otherwise** | Read-only, under a notice naming the reason, with **Edit for this quiz** | — (or, after *Edit for this quiz*, the copy is created) |

- **Why those three conditions.** They are exactly the ways an edit could reach someone else: a
  question someone else owns, a quiz that isn't this one, a player's results. With all three
  clear, editing in place is indistinguishable from editing a draft.
- **How a question was made is not part of it.** It isn't recorded — a question created inside a
  quiz looks exactly like one made on the Questions page — and it isn't what makes an edit safe. A
  question created with this quiz passes the rule on its own merits until someone plays it.
- **Owner only, admins included.** `question:update:any` lets an admin edit any question on the
  Questions page, where changing it everywhere is the point; in the builder an admin edits as the
  quiz's author.
- **"Another quiz"** means a *live* row in a quiz that isn't soft-deleted and isn't the one being
  edited (while creating, every quiz counts). A quiz that dropped the question in an earlier
  version doesn't count. **"Answered"** means any `UserAnswer` row, in any quiz.
- **The reasons**, in the order the notice gives them: *Another author's question* →
  *Players have answered this question* → *N other quizzes use this question too*.

**Where it lives.** `QuestionEditRule` (`Common/QuestionEditRule.cs`) is the rule;
`IQuestionRepository.GetEditFactsAsync` gathers the facts for the caller's own questions only.
`GET /api/questions/editability?ids=…&quizId=…` answers per question; the builder asks it for
every saved question it holds (`useQuestionEditability`, via `QuizQuestionProvider`, which
`edit-quiz.tsx` gives the quiz id). **The API is the gate:** the builder's in-place save sends
`?fromQuizBuilder=true&quizId=…` to the question update endpoint, which re-checks the rule and
answers **409** if, say, someone played the quiz in the meantime — the save stops and the message
says to edit a copy. The Questions page sends neither and is not limited.

**How the builder tells them apart.** By shape, not id sign (`edit-copy.ts`): a saved question is
`AnyQuestion`-shaped (lookups as objects); the editors only speak draft (`NewAnyQuestion`).
`BuilderQuestionEditor` — the one component the desktop centre panel and the overview's dialog
both render — shows a saved question the rule allows on `toInPlaceDraft` (same id, visibility and
option ids). The editors write back as soon as they open, so the question turns draft-shaped
without being changed; the provider keeps its original, and the save compares (`sameContent`)
and skips an unchanged one. **Edit for this quiz** swaps in `toEditableCopy` instead: a new
negative id, **Private**, fresh option ids — the original and every other quiz stay as they are.

To change a question everywhere it is used, edit it on the Questions page.

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

The builder's removal and copy rules are frontend unit tests in `Create-Quiz-Form/__tests__/`:
`question-history.test.ts` (the Undo stack's order), `edit-copy.test.ts` (the copy's fields) and
`question-removal-flow.test.tsx` (the provider's confirm → remove → undo → copy flow).
