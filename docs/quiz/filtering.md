# Filtering, Sorting & Pagination

A single, reusable framework for "complex" list queries — e.g. *questions from a specific
user created within a timeframe, matching a search term, newest first* — used the **same way
across every service and on the frontend**. This replaces the per-entity, copy-pasted
`ApplyFilters` methods and the one-action-per-field reducers.

## Design goals

- **One model, many entities.** The same request shape (filters + search + sort + paging)
  and the same response shape (`PagedResponse<T>`) for questions, quizzes, audit logs, users…
- **Operators, not just equality.** `eq, neq, contains, startsWith, gt, gte, lt, lte, in, between`.
- **Safe by construction.** Clients can only touch fields a per-entity **whitelist** exposes,
  with only the operators that field allows. No dynamic LINQ string, no SQL injection surface.
- **Translatable to SQL.** Everything composes into the EF `IQueryable`, so filtering, sorting
  and paging all run in the database.
- **Reused on the frontend.** A typed builder serializes the exact same model to the query string.

## Decision: pagination lives in the body

The app previously returned pagination two ways — a `Pagination` **header** (questions/quizzes)
and a **body** object (audit logs). We standardize on the **body envelope**:

```jsonc
{
  "items": [ /* … */ ],
  "page": 1,
  "pageSize": 20,
  "totalItems": 137,
  "totalPages": 7,
  "hasPreviousPage": false,
  "hasNextPage": true
}
```

Why body over header: it's strongly typed end-to-end (no header parsing/validation), it
survives proxies and doesn't need CORS `WithExposedHeaders`, and it pairs naturally with the
generic `PagedResponse<T>`. The header approach was reasonable, but the body envelope is the
better fit for a typed, reusable framework. Existing header-based endpoints keep working and
migrate incrementally (see *Migration path*).

## The wire format

A filtered endpoint binds a single `FilterQuery` from the query string:

| Param | Meaning | Example |
|-------|---------|---------|
| `page`, `pageSize` | Paging (pageSize clamped to 100). | `page=1&pageSize=20` |
| `search` | Free-text across the entity's *searchable* fields. | `search=capital` |
| `sort` | Comma-separated `field:dir`. | `sort=createdAt:desc,text:asc` |
| `filter` | Repeated, one per rule: `field:operator:value[,value2]`. | `filter=userId:eq:GUID` |

The headline example — *user within a timeframe, text search, newest first*:

```
GET /api/questions/search
  ?search=capital
  &filter=userId:eq:6f9b…&filter=createdAt:between:2026-01-01,2026-03-31
  &sort=createdAt:desc
  &page=1&pageSize=20
```

`in` and `between` take comma-separated values: `filter=type:in:MultipleChoice,TrueFalse`,
`filter=createdAt:between:2026-01-01,2026-03-31`.

> **Pseudo-sort exception:** the quiz search additionally understands
> `sort=variety:desc` — a category-interleaving order that isn't a plain `ORDER BY
> column` and therefore lives outside the whitelist. `FilterEngine` ignores the unknown
> field as usual; `QuizService.SearchQuizzesAsync` detects and applies it afterwards.
> See [quiz-discovery.md](quiz-discovery.md).

## Backend architecture (`QuizAPI.Filtering`)

| File | Role |
|------|------|
| `FilterPrimitives.cs` | `FilterOperator` enum, `FilterRule` (+ `TryParse` of the wire format), `FilterQuery` (bound from query string). |
| `FilterFieldSet.cs` | `FilterableField<T>` and `FilterFieldSet<T>` — the per-entity **whitelist** of which fields are filterable / searchable / sortable, plus the default sort. |
| `FilterEngine.cs` | Turns a `FilterQuery` + a `FilterFieldSet<T>` into EF predicates, a search OR-clause, and dynamic ordering — all expression trees. |
| `PagedResponse.cs` | The body envelope + `CreateAsync(IQueryable, page, pageSize)`. |

**Safety model.** `FilterEngine` only acts on fields present in the `FilterFieldSet<T>`, and only
with operators that field whitelists. Unknown fields, disallowed operators and unparseable
values are **silently skipped** (malformed input degrades to "no extra filter", never a 500).
String matches are case-insensitive (`LOWER(col) LIKE …`). There is always a deterministic
default sort so paging is stable.

### Adding filtering to an entity (3 steps)

1. **Declare the whitelist** — one static `FilterFieldSet<TEntity>`:

   ```csharp
   public static class QuestionFilterFields
   {
       public static readonly FilterFieldSet<QuestionBase> Fields = new FilterFieldSet<QuestionBase>()
           .Field("text",       q => q.Text,      new[] { Contains, StartsWith, Eq }, searchable: true, sortable: true)
           .Field("categoryId", q => q.CategoryId, new[] { Eq, In })
           .Field("userId",     q => q.UserId,     new[] { Eq })
           .Field("createdAt",  q => q.CreatedAt,  new[] { Eq, Gt, Gte, Lt, Lte, Between }, sortable: true, defaultSort: true);
   }
   ```

2. **Apply it in the service** — filter, project, page:

   ```csharp
   public async Task<PagedResponse<QuestionBaseDTO>> SearchQuestionsAsync(
       FilterQuery query, Guid? restrictToUserId = null, CancellationToken ct = default)
   {
       IQueryable<QuestionBase> q = _context.Questions.AsNoTracking()
           .Include(x => x.Difficulty).Include(x => x.Category)
           .Include(x => x.Language).Include(x => x.User);

       if (restrictToUserId is { } uid)      // server-derived ownership clamp
           q = q.Where(x => x.UserId == uid); // applied BEFORE client filters

       q = FilterEngine.Apply(q, query, QuestionFilterFields.Fields);

       // Project to the DTO with a static, EF-translatable projection (see Mapping/EntityMappers.cs).
       var projected = q.Select(QuestionMappers.ProjectBase);
       return await PagedResponse<QuestionBaseDTO>.CreateAsync(projected, query.Page, query.PageSize, ct);
   }
   ```

3. **Expose the endpoint** — bind `FilterQuery` from the query string:

   ```csharp
   [HttpGet("search")]
   public async Task<IActionResult> SearchQuestions([FromQuery] FilterQuery query, CancellationToken ct)
       => Ok(await _questionService.SearchQuestionsAsync(query, ct: ct));
   ```

**Security note — self-scoped lists.** For "my X" endpoints, pass `restrictToUserId` from the
authenticated user. It's applied as a hard `Where` *before* the client's filters, so query
params can only ever narrow within the caller's own rows (mirrors the existing `myQuestions`
pattern). See `GET /api/questions/mine/search`.

## Frontend architecture (`src/lib/filtering`)

| File | Role |
|------|------|
| `types.ts` | `FilterOperator`, `FilterRule`, `SortRule`, `FilterQuery`, `PagedResponse<T>` — the mirror of the backend model. |
| `filter-builder.ts` | `rule.*` builders (`rule.eq`, `rule.between`, …), `sortBy`, and `buildFilterParams` (serializes to the wire format; drops empty rules). |
| `fetch-paged.ts` | `fetchPaged<T>(url, query)` → `PagedResponse<T>`. |

Data hooks keep the project's `getX / getXQueryOptions / useXData` convention but take the
generic `FilterQuery` instead of a hand-rolled per-endpoint param type. Reference:
`src/pages/Dashboard/Pages/Question/api/search-questions.ts`.

```ts
import { rule, sortBy } from "@/lib/filtering";
import { useSearchQuestions } from ".../api/search-questions";

const { data } = useSearchQuestions({
  query: {
    search: "capital",
    filters: [
      rule.eq("userId", userId),
      rule.between("createdAt", "2026-01-01", "2026-03-31"),
    ],
    sort: [sortBy("createdAt", "desc")],
    page: 1,
    pageSize: 20,
  },
});
// data: PagedResponse<QuestionBase> → data.items, data.totalPages, data.hasNextPage…
```

A `buildUserWithinTimeframeQuery({ userId, from, to, search })` helper in that file assembles
the headline use-case from high-level args.

### Wiring a filter UI

Hold a `FilterQuery` in component state (or a reducer), feed it to the hook, and render
controls that push `rule.*` entries into `filters`. Because empty rules are dropped during
serialization, optional controls can always be present in the array. The existing
`Quiz-Filter` component suite (presets, saved filters, active-filter pills) can be refactored
to emit `FilterRule[]` instead of its bespoke per-field reducer — tracked below.

## What's implemented now

**Framework** — backend `QuizAPI.Filtering` and frontend `src/lib/filtering/*` (types, builders,
`fetchPaged`).

**Questions** ✅ wired end-to-end:
- Backend: `QuestionFilterFields.For<T>()`, `QuestionService.SearchQuestionsAsync` (base) plus typed
  `Search{MultipleChoice,TrueFalse,TypeTheAnswer}QuestionsAsync`; endpoints `GET /api/questions/search`,
  `…/{type}/search`, and `…/mine/{type}/search` — all returning `PagedResponse`.
- Frontend: `search-questions.ts` (base) and `search-questions-typed.ts` (`useTypedQuestionSearch`).
  `QuestionTabContent` now maps its UI inputs to a `FilterQuery` (single `toFilterQuery`) and reads the
  body envelope, so the admin Questions page, the quiz-creator question picker and the user dashboard
  all run on the framework. The admin page gained a **created-date range** ("within a timeframe") filter.

**Quizzes** ✅ wired end-to-end:
- Backend: `QuizFilterFields`, `QuizService.SearchQuizzesAsync`; endpoints `GET /api/quiz/search`
  (public), `/api/quiz/mine/search`, `/api/quiz/all/search`.
- Frontend: `search-quizzes.ts` (`useSearchQuizzes`) + `QuizFiltersPanel` (categories, difficulties,
  languages, visibility, published/active tri-states, admin **author** filter, date range, pills).
  Used by the admin Quizzes page and **MyQuizzes** (scope `mine`, no author filter).
- Public catalogue pickers (`/choose-quiz` and the multiplayer lobby dialog): faceted
  multi-select filters in `src/pages/Quiz/components/quiz-filters/` — `useQuizFilterState`
  holds the selections and serializes each facet to one `in` rule
  (`categoryId`/`difficultyId`/`languageId`); `QuizFilterPanel`/`FacetSection` render the
  collapsible checkbox groups with per-facet search and selected options pinned on top.
  See docs/quiz/quiz-discovery.md for how the facets compose with the variety sort.

**Users** ✅ wired end-to-end:
- Backend: `UserFilterFields` (username/email search, isDeleted, registered/last-login ranges),
  `UserRepository.Query()`, `UserService.SearchUsersAsync`; `GET /api/users/search` (admin-only).
- Frontend: `search-users.ts` (`useSearchUsers`) + inline `UserFilters`; the Users page is now
  server-filtered + paginated (was client-side).

**Audit log** ✅ on the framework:
- Backend: `AuditLogFilterFields` (action, entity, userId, ipAddress, createdAt), `IAuditLogRepository.Query()`,
  `GET /api/auditlogs/search` returning `PagedResponse`.
- Frontend: `search-audit-logs.ts` + inline panel (multi-select action/entity, **actor** filter,
  date range, pills). Actor/Actor-column resolve user ids to usernames.

**Categories** ✅ wired end-to-end:
- Backend: `CategoryFilterFields` (name search, creator, gradient, createdAt); `GET /api/questioncategories/search`.
- Frontend: `search-question-categories.ts` + inline `CategoryFilters`; `CategoryView` is server-filtered + paginated.

**Shared UI building blocks:** `MultiSelect` (generic over string|number, optional search box),
`DateRangeFilter`, `TriStateSelect`, `ActiveFilterPills` — all styled to the quiz `form` look and reused
across every panel.

## Migration path (remaining)

**Retire the legacy read paths** once nothing references them: the header-based `GET /api/questions`,
`GET /api/quiz`/`my`/`public`, the audit `GET /api/auditlogs` (legacy `AuditLogQuery`), the typed
`get-*-questions.ts` / `get-my-questions.ts` / `get-all-quizzes.ts` / `get-my-quizzes.ts` hooks,
`QuestionFilterParams` / `QuizFilterParams`, the per-service `ApplyFilters`, and
`PagedList` + `AddPaginationHeader`. All additive — the `…/search` endpoints live beside the old ones,
so nothing breaks until the legacy paths are deleted.

## Testing

- **Unit** the `FilterEngine` against an in-memory/SQLite `IQueryable`: each operator, the
  field whitelist (a disallowed field/op is ignored), case-insensitive search, multi-key sort,
  and the default sort fallback.
- **Integration** `GET /api/questions/search` with `WebApplicationFactory`: the user+timeframe
  example returns only matching rows; `pageSize` is clamped; `mine/search` can't be widened past
  the caller's own rows via query params.
