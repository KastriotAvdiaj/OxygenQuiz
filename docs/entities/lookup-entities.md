# Lookup entities: categories, difficulties, languages

The three small tables every question and quiz is filed under. They behave as one family and
should keep doing so — a rule applied to one of them and not the others is how they drifted
apart in the first place.

Last updated: 2026-08-23, when all three were moved off direct `DbContext` access.

---

## 1. What they have in common

| | Categories | Difficulties | Languages |
|---|---|---|---|
| Controller | `QuestionCategoriesController` | `QuestionDifficultiesController` | `QuestionLanguagesController` |
| Repository | `IQuestionCategoryRepository` | `IQuestionDifficultyRepository` | `IQuestionLanguageRepository` |
| Service | **yes, when the palette proposer lands** | none | none |
| Extra columns | `ColorPaletteJson`, `Gradient` | `Weight` | — |
| Admin read | `GET /search` (filtered, paged) | `GET /admin` | `GET /admin` |

## 2. Reads are anonymous; the creator's name is not

Guests browse and play quizzes, and that needs category, difficulty and language names — so
the list endpoints stay anonymous, and gating them would break guest play
([`../auth/guest-play.md`](../auth/guest-play.md)).

**But `Username` is not part of a public shape.** Who created a lookup row is admin metadata.
It used to sit on `QuestionCategoryDTO`, `QuestionDifficultyDTO` and `QuestionLanguageDTO` —
and because those DTOs are embedded in `QuestionDTOs` and `QuizDTO`, the creator's username
rode along on every category inside every question and quiz payload, several of which are
anonymous.

The shape is therefore split, and the split is the convention for any lookup added later:

- `XDTO` — public. No `Username`. Embedded freely.
- `XAdminDTO : XDTO` — adds `Username`. Served **only** from a role-gated endpoint.

Inheritance rather than two flat types, so a field added to the public shape reaches the admin
one automatically and the difference stays exactly one line.

On the client, `username` is optional on all three types. If you are rendering a lookup outside
the dashboard's own tables it is `undefined`, and that is correct rather than a bug to work
around. The admin tables read from their own query key (`["getQuestionDifficulties", "admin"]`)
so a public response cannot overwrite their cache and blank the column.

## 3. Nothing outside a repository touches `DbContext`

All three controllers used to inject `ApplicationDbContext` and query it directly — a step past
what `CLAUDE.md` forbids, since there was no service either. They were the only entities in the
codebase without a repository.

**Search is a method on the repository, not an `IQueryable` handed out.** Returning a queryable
moves EF back into the caller and puts the paging and the `FilterEngine` field whitelist
somewhere a second call site can get wrong.

**No service layer on difficulties and languages, deliberately.** A service earns its place when
it has its own reason to change — a rule that is neither the HTTP shape nor the query. These two
have none, so a service could only forward one call and return, in exchange for a file, an
interface, a DI registration and a mock in every test. Categories gets one when the AI palette
proposer arrives, because that is a real rule. Add a service the day a rule shows up, not before.

## 4. Names are unique, case- and whitespace-insensitively

Create and update both reject a duplicate with `ConflictException` → 409.

This is not tidiness. The AI generation flow resolves the model's suggested category and language
**by name** against these tables (`use-ai-quiz-draft.tsx`), so two rows called "Science" make that
resolution arbitrary — and the loser silently becomes a `needsConfirmation` prompt the user
cannot explain. See [`../quiz/ai-quiz-two-paths.md`](../quiz/ai-quiz-two-paths.md).

> **If the database already contains duplicates, updates to those rows will now 409.** Check
> before deploying.

## 5. Permissions

| | Read | Admin read | Create | Update | Delete |
|---|---|---|---|---|---|
| Categories | anonymous | Admin | Admin | Admin | SuperAdmin |
| Difficulties | anonymous | Admin | Admin | Admin | SuperAdmin |
| Languages | anonymous | Admin | **Admin** | SuperAdmin | SuperAdmin |

**Languages create was previously ungated.** The action carried no `[Authorize]` attribute and
the class carries none either, so any signed-in user could append a row — the only thing in the
way was the null check on `UserId`. Nothing about languages makes them safer to seed than
categories, and these tables are handed to the AI generator as the vocabulary it may choose
from.

## 6. Mutations take a create model, never the entity

`PUT` on difficulties and languages used to accept the entity and mark it
`EntityState.Modified`, which made every column writable from the request body — including
`UserId` and `CreatedAt`. Both now take their `...CM` and copy the two or three fields that are
meant to be editable. The scaffolded link to Microsoft's over-posting warning was sitting
directly above the code that ignored it.

`POST` returns the created **DTO**, not the entity and not the request model. Languages used to
return the request model, so the caller never learned the new row's id.

## 7. Known gaps

- `Category.gradient` is stored, editable and filterable but never rendered — see
  [`../deployment/known-issues.md`](../deployment/known-issues.md).
- Difficulties and languages have no `FilterEngine` field definitions, so their admin reads are
  plain lists rather than `/search`. Fine at this size; give them one when the tables grow.
