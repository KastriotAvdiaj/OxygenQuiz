## Commit messages

Keep them short. A subject line plus a few lines of body — enough to say what
broke and what changed, not a write-up. Detailed reasoning belongs in `docs/`
and in code comments, not in the commit.

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

## Backend conventions (C#)

- **Services never touch `DbContext`.** Query through the repository interfaces so the data
  access stays in one layer and services stay unit-testable.
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
- **Validate lookups after the ownership lookup, not before,** for the same reason: failing
  on a bad category id before checking ownership leaks whether the question exists.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
