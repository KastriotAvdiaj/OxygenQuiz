## Commit messages

Keep them short. A subject line plus a few lines of body — enough to say what
broke and what changed, not a write-up. Detailed reasoning belongs in `docs/`
and in code comments, not in the commit.

## Documenting changes

**A structural change is not finished until it is written down** — same change, not a
follow-up. Where it goes, narrowest first: `docs/adr/` for a decision that is hard to
reverse, surprising without context, and a real trade-off (append-only; supersede, never
edit); `docs/<area>/*.md` for how something behaves today;
`docs/deployment/known-issues.md` for something real, found, and deliberately deferred; a
doc comment for reasoning that only makes sense beside the code.

Not for renames, typos, or anything a reader gets from the diff. Plan docs (`*-plan.md`)
are transient: fold what is still true into the feature doc and delete the plan.

**Nobody has to ask for the ADR.** When a piece of work clears the three tests above, the ADR
is part of that work, written without prompting — the same way the code is. Waiting to be
asked is how the reasoning ends up in a code comment instead, which is failure mode one below.

Full version, including the two failure modes this project has actually hit:
[`docs/development/documenting-changes.md`](docs/development/documenting-changes.md).

## Frontend conventions (React + TypeScript)

### Effects and state

- **An Effect synchronizes with a system outside React** — a timer, a socket, an event
  listener, a browser API, a DOM measurement. If you can't name the external system, it
  shouldn't be an Effect. Everything else has a better tool, and an Effect costs an extra
  render plus a dependency array that drifts out of date.
- **Derive during render instead of storing.** State that mirrors other state has to be kept
  in sync forever, and the sync is always one render behind. `useMemo` only when profiling
  says the computation is expensive.
- **Logic caused by a user action belongs in the handler**, not in an Effect watching the
  result. If a click should update a form field, the click handler updates it — an Effect
  that re-does what the handler already did is dead weight (see the `imageUrl` Effects in
  the question forms for the pattern to stop repeating).
- **Reset a component with `key`, not an Effect on a prop.** Remounting is one line and
  can't get the ordering wrong.
- **Server state is React Query.** Never `useEffect` + `fetch`. Caching, invalidation and
  request de-duplication are already solved and already wired up.

### Data fetching and forms

- **Mutations invalidate the broad roots in `src/lib/query-keys.ts`** (`questionKeys.all`,
  `myQuestionKeys.all`, …). Prefix matching covers every list variant — admin search, typed
  search, user dashboard — so enumerating them invites the one you forgot.
- **The zod schema lives next to its mutation in `api/`** and reaches the form through
  `<Form schema={...}>`. One definition drives validation, the inferred input type, and the
  request body.
- **Client validation mirrors an API rule; it is never the rule itself.** The API is the
  gate, the client is fast feedback. When you add one, note its API counterpart in a comment
  so the pair stays findable — the classification and acceptable-answer comments do this.

### Styling

- **Tailwind class strings stay complete literals.** Never build one by concatenation or
  interpolation — the JIT compiler only generates classes it can read verbatim in source, so
  `` `dark:${borderColor}` `` silently produces nothing.
- **Colors come from theme tokens or `question-type-theme.ts`,** never raw hues in a
  component. See `docs/quiz/question-type-color-schema.md` for what each token means and the
  rule it enforces: color encodes *type* quietly, *state* is what gets loud.
- **A color chosen at runtime is a CSS variable, not a class** — it can't be a class, by the
  rule above. Every theme color is published as `--color-<name>-<shade>` by the
  `paletteVariables` plugin in `tailwind.config.js`, so a prop that takes a color can name the
  scale (`liftColor="red-400"`) instead of carrying a hex, and a value with no token at all —
  a quiz's category palette — reaches the element as an inline custom property (`--edge`,
  `--face` on the start modal). Theme token first, palette entry second, raw color last: only
  the first follows the theme into dark mode.
- **Inside a dashboard, a card is `bg-card border dark:border-foreground/30`.** The dashboard's
  `main` is `bg-muted`, and a plain `<Card>` is *also* `bg-muted` in dark mode — so it vanishes
  into the page, leaving floating text. Applies to anything under `/dashboard` or
  `/my-dashboard`: cards, empty states, and clickable list rows (`bg-card` on the row). Outside a
  dashboard the page is `bg-background` and a plain `<Card>` is right. See
  `docs/RESPONSIVE.md`, "Surfaces inside a dashboard".
- **Dialogs are `bg-background`** — the shared `DialogContent` default. Don't give one
  `bg-muted`: a muted dialog over a muted dashboard is the same vanishing act as above.
- **Dialog footers use `ConfirmationDialog`'s buttons:** the action first as a `LiftedButton`
  (default blue; destructive is `bg-red-600 text-white … liftColor="red-700"`), then Cancel as
  a lifted outline (`bg-background border border-foreground/30 … liftColor="muted"`). Not the
  flat `Button` ghost/destructive pair — a form dialog's footer copies the same two.
- **A page header is the h1 and its actions — no description paragraph under it.** A sentence
  of grey text explaining what the page is reads as filler and pushes the content down; the
  title, the empty state and the controls carry that. Put a needed explanation where it's
  needed (an empty state, a field hint), not under the title.

## Backend conventions (C#)

- **Nothing outside a repository touches `DbContext`** — services *or* controllers. Query
  through the repository interfaces so data access stays in one layer and callers stay
  unit-testable.
- **A service is warranted when it has its own reason to change** — a rule that is neither the
  HTTP shape (controller) nor the query (repository). For CRUD over a lookup table there is no
  such rule, and a service that only forwards costs a file, an interface, a DI registration and
  a mock in every test. Controller → repository is correct there; add the service the day a rule
  appears. See `docs/entities/lookup-entities.md`.
- **A lookup's public DTO carries no creator/owner metadata.** These DTOs get embedded in
  question and quiz payloads that are readable anonymously. Put it on an `XAdminDTO : XDTO` and
  serve that from a role-gated endpoint only.
- **Throw typed exceptions for domain rules** — `AppValidationException`, `NotFoundException`,
  `ConflictException`, `ForbiddenException`. `GlobalExceptionHandler` maps each to its status
  code, so a rule expressed this way returns a correct response from every endpoint that
  calls it, including the bulk importers.
- **Read projections are translated to SQL.** No `enum.ToString()`, no helper method calls,
  nothing EF can't translate — use a ternary chain instead (see `ProjectBase` and the
  `MediaType` mapping).
- **Permission checks in the controller, ownership clamps in the repository.** The controller
  decides *may this caller act*, the repository decides *on which rows* — passing
  `canUpdateAny ? null : userId` down keeps a caller from probing ids they can't touch.
- **`Quiz` has no visibility query filter — only soft delete.** An endpoint that returns a quiz
  checks Draft / Unlisted / ownership itself. Don't add a second `HasQueryFilter` to an entity: in
  EF Core 8 it replaces the first. See `docs/adr/0019-quiz-visibility-is-enforced-at-each-entry-point.md`.
- **A new read of quizzes applies `VisibleTo(_current.IsAdmin)` / `QuizFormatAccess.IsAvailableTo`.**
  Formats in preview (Associations) are admin-only, and a read that skips it leaks them to players.
- **An Associations game is its move log — never store board state.** Replay the moves under the
  game's `RulesJson` (ADR 0020). Anything that deletes `QuizSession` rows calls
  `IAssociationGameRepository.DeleteGamesOfSessionsAsync` first; the FK restricts it otherwise.
- **Work that outlives a hub invocation takes an `IServiceScopeFactory`, never the hub's
  `IServiceProvider`** — that one is the invocation's scope, disposed when it returns. The
  disconnect grace did this and silently removed nobody (`docs/quiz/multiplayer.md` §3.5).
- **Validate lookups after the ownership lookup, not before,** for the same reason: failing
  on a bad category id before checking ownership leaks whether the question exists.

## Tests

Three suites: backend xUnit, frontend Vitest (`--project unit`), and Playwright end-to-end in
`e2e/`. Which one a test belongs in, and how each is written: [`docs/development/testing.md`](docs/development/testing.md)
and [`docs/development/e2e-testing.md`](docs/development/e2e-testing.md).

- **E2E tests are for the seams** — SPA ↔ API, cookies, route guards, whole journeys. A branch of
  one function's logic is a unit test. One E2E test per journey, not per edge case.
- **E2E tests make their own data through the API** (`e2e/support/api.ts` fixtures), under unique
  names, and never touch the database. The E2E stack has its own ports and database; settings it
  needs go in `e2e/support/stack.ts`, never a local appsettings or user-secrets.
- **Locators are what a user sees** — role and name, then label, placeholder, text. No CSS classes,
  no positions (answer options are shuffled), no `waitForTimeout`.
- **A new test has failed at least once** with the behaviour it protects broken, and passed
  `--repeat-each 5 --workers 4`. Add its row to the inventory in the doc in the same change.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
