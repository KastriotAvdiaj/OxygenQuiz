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

## 2b. On the client they are cached for an hour, not a minute

Every page with a filter panel loads all three lists on mount — the public quiz browser
(`Quiz-Selection.tsx`) included, so guests fetch them too. That is unavoidable rather than
careless: `/quiz/search` filters by **id** and the UI shows **names**, so something has to hold
the mapping, and it has to be there before the dropdown opens or a deep link with a filter
already applied cannot render its own pills.

The app-wide `staleTime` is one minute, which is right for quizzes and sessions and wrong for
three tables an admin edits maybe monthly. All three query-options factories therefore set
`staleTime: LOOKUP_STALE_TIME` (one hour, defined in `src/lib/React-query.ts`).

**Freshness comes from invalidation, not expiry**, which is why the long window is safe: every
create, update and delete invalidates its list key, and the paged search keys share the same
root (`["questionCategories", "search", …]`), so one `invalidateQueries` evicts both. An admin
renaming a category sees it immediately. The hour only suppresses refetches that were never
going to return anything different.

Not `Infinity`, deliberately — that would also outlive a row edited in another tab or by
another admin until a mutation happened in *this* tab. An hour bounds that without giving up
the benefit.

> This is a client-side cache only. The server still hits the database on every request; there
> is no `IMemoryCache` on these endpoints, unlike `PermissionService`. Worth adding if the
> lookup endpoints ever show up in server load — see §7.

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
- **No server-side cache on the list endpoints.** Each request is a full unpaginated table read
  (`AsNoTracking`, projected to the public DTO), and the client-side hour in §2b is the only
  thing keeping the volume down. An `IMemoryCache` entry per table, evicted on write, is the
  obvious next step — `PermissionService` already does exactly this shape — but there is no
  measured load to justify it yet.
- **Every list endpoint returns the whole table.** Around a few hundred rows a `<select>` stops
  being a usable control long before the payload matters, so the fix at that point is a
  type-ahead against the paged `/questioncategories/search` (which exists and is already wrapped
  by `useSearchQuestionCategories`), not a bigger dropdown.
