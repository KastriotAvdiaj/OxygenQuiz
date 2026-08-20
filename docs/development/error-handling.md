# Error Handling

How a failure becomes something the user can act on, and the rules that keep React
Router's raw `Unexpected Application Error!` page (stack trace and all) off the screen.

## The default: queries throw — except on 401

`src/lib/React-query.ts` makes `throwOnError` a predicate: every failed query throws during
render into the nearest error boundary, **except a 401**, which stays a normal query error.

A 401 is not a crash — it means "you are not signed in", an ordinary state on a public page.
Escalating it meant a single authenticated query, mounted anywhere in a shared component,
replaced the whole app with "Something went wrong" for every signed-out visitor.

### The bug that motivated this (worth understanding — it will recur)

`AccountOverlay` is mounted in `layout.tsx`, so it renders on **every** route including the
public home page. It calls `useSettingsForm()` → `useSettingsData()` → `GET /api/settings`,
which is `[Authorize]`'d. The component *does* check `if (!user) return null` — but that runs
**after** the hook, because React forbids conditional hook calls. The request went out for
anonymous visitors anyway, took a 401, and threw.

The result: a home page that worked perfectly for the developer (always signed in) and
white-screened for every logged-out visitor. It surfaced only because it reproduced on a phone
where no session existed.

**The rule:** a hook fires its request when it is *called*, not when its component decides to
render something. Any query against an `[Authorize]`'d endpoint from a globally-mounted
component needs an explicit `enabled` guard — `useSettingsData({ enabled: !!user })` — not just
a render-time `if (!user)`.

The 401 exemption is the safety net beneath that rule, not a substitute for it: an unguarded
query still fires a pointless request and still logs server-side.

That's deliberate: a broken screen fails loudly instead of rendering half-empty. The
consequence is that an `if (isError)` branch in a component is **dead code** unless that
query opts out. If you write one, opt the query out in the same commit.

### When to opt out

Set `throwOnError: false` on the query options when the data is **supplementary** — the
page is still worth showing without it:

```ts
queryOptions({
  queryKey: ["user-quiz-stats", userId],
  queryFn: () => getUserQuizStats(userId),
  throwOnError: false, // stats render as "—" if this fails; don't kill the page
});
```

Current opt-outs, all for the same reason: `get-user-quiz-stats`, `get-user-sessions`,
`check-availability` (signup hints), `email-verification` (resend), `auth-config` (a
logged-out 401 is a normal state, not an error), `ai-quota`.

> **`ai-quota` is the one that got away, and it reached production.** The AI wizard calls
> `GET /quiz/ai-quota` on mount purely to render "2 of 2 left today". It had `retry: false`
> but no `throwOnError: false`, so when that endpoint started answering **400** in production
> the whole page became "Something went wrong" — including the copy-your-own-prompt path,
> which needs neither the quota nor the AI service and was the one thing still working.
>
> The tell is worth remembering: the query's own consumers were already written for absence
> (`quota: AiQuotaStatus | null`, "null while loading or when the endpoint isn't reachable"),
> which is the signature of supplementary data. **If a prop type says the data may be missing,
> the query must not throw** — otherwise the handling you wrote is unreachable and a boundary
> decides instead.

Keep throwing for data the screen is *about* — a quiz page with no quiz has nothing to
render.

### The corollary: don't write an in-page card for something that throws

If a query throws, the boundary replaces your component *before* it renders. Any
`if (somethingFailed) return <ErrorCard/>` downstream of that query is unreachable — and
unreachable error handling is worse than none, because the next person reads it and believes
the case is covered. A Storybook story for it is worse still: a picture of a state production
cannot produce.

Both AI views carried exactly that ("Oops! Brain freeze!", plus an `EntityLoadError` story)
for the category/language/difficulty lookups. Those three keep throwing on purpose — you
cannot pick a category from a list that never loaded, and `buildInput` sends those very names
to the model as the vocabulary it may choose from, so a page without them can't do its job.
The card and the story are gone; the route's `DashboardErrorElement` is the handling.

So: **pick one per query.** Either it is supplementary → opt out *and* render the absence, or
it is essential → let it throw and let the route's error element be the whole story. Writing
both is how you end up with a page that looks defensive and isn't. The same dead branch still
exists in `Create-Quiz-Form/create-quiz.tsx` and `edit-quiz.tsx` if you want to sweep it.

## Mutations: the global toast, and opting out of it

Query failures throw into a boundary. **Mutation** failures don't — they surface as a toast,
fired centrally by the response interceptor in `src/lib/Api-client.ts`. Nothing needs to opt
*in*: any non-2xx that isn't a 401 or 404 produces one.

That default is right for "the delete failed" and wrong whenever the caller shows the failure
itself. Two surfaces for one error is noise; three is a bug report. Set `skipErrorToast` on the
request config when the caller renders its own:

```ts
api.post("/quiz/ai-generate", data, { skipErrorToast: true });
```

The flag is a typed part of `AxiosRequestConfig` (declaration-merged in `Api-client.ts`), so a
typo is a compile error rather than a silent duplicate toast. It was previously an undeclared
key that every call site smuggled through an `as any` cast; the casts are gone, and
`apiService`'s `config` parameter is typed rather than `{}`, so the flag is checked there too.

> **`apiService`, not `api`.** The raw instance's success interceptor returns the whole
> `AxiosResponse` — only `apiService` unwraps `.data`. `api.post(url, body)` annotated
> `Promise<Thing>` compiles (axios infers its response type from the expected return type) and
> then hands you an object whose every field is `undefined`. It fails silently, at render, as
> the word "undefined" on the page. Reach for `api` only when you want headers.

Current opt-outs and why:

| Caller | Surfaces the error as |
|---|---|
| `check-availability` (signup) | Inline field hint under the username/email |
| `Auth.tsx` login / external sign-in | The form's own message, on the step that failed |
| `auth-config` | Nothing — a failed config fetch falls back to defaults |
| `quiz/ai-generate` | The wizard's error panel, which offers a different next step per code |
| `quiz/ai-prompt` | A toast the container raises itself, with copy specific to copying |

**The rule of thumb:** if the failure has a natural home on screen — beside the field, beside
the button — put it there and skip the toast. Reach for the toast when the failure has nowhere
to live, or when the user has already navigated away from the thing that failed.

### What the toast *says*

Whether a toast fires and what it contains are two different mechanisms. The section above is
the first. This is the second, and it was undocumented for over a year.

#### The allowlist that used to eat it

`Api-client.ts` held `CUSTOM_ERROR_PATTERNS`: seven hard-coded substrings (`"already exists"`,
`"not authorized"`, …). A message matching one was shown; **everything else was replaced with
"An unexpected error occurred. Please try again."** It shipped 2025-06-20 and was never
revisited.

The intent was right — don't paste an EF exception or a stack trace into a toast. The
implementation inverted the safe default. It is a denylist problem solved with an allowlist, so
every message anyone wrote from then on was untrusted unless they also remembered to edit a
constant on the other side of the wire. The failure is silent, and it compounds: by the time it
was found, `QuestionService`'s carefully worded *"Pick a category for this question —
'Unspecified' isn't allowed."* and `QuizService`'s *"Pick a category for this quiz…"* were both
unreachable by users, and an AI-import 400 took a code read to diagnose.

There was a second copy of the same idea on the backend. `BaseApiController.HandleFailure`
computes `isCustomMessage` by matching the message against *its own* pattern list — ten
entries, where the frontend had seven. Two allowlists, already drifted, neither documented.

#### What replaced it: classify by who wrote the message

The only question that matters for display is **did a person write this string for a person?**
`parseApiError` answers it from the response alone, and sorts every failure into one of three
kinds:

| Kind | Meaning | Shown |
|---|---|---|
| `authored` | A developer wrote this for a user | The message, verbatim |
| `generated` | A framework produced it from types and field names | "Some of the details weren't accepted…" |
| `opaque` | A 5xx — may be an EF exception or a stack trace | "An unexpected error occurred…" |

Two signals decide the kind, and **neither requires anything from the code that threw**:

**The status code.** A 4xx is by definition the class of error that is *about the caller* — the
server computed a specific reason and the point of sending it is for a human to read it. A 5xx
is the server falling over. So 5xx is `opaque` unless explicitly flagged otherwise.

**The presence of an `errors` dictionary**, which separates the two `ProblemDetails` shapes.
`GlobalExceptionHandler` constructs a plain `ProblemDetails` — no `errors`. ASP.NET's model
binder constructs a `ValidationProblemDetails` — always `errors`. That is structural, not
conventional: neither side has to declare anything, and it can't drift.

This matters because a model-binding 400 is not a user-facing message. It looks like:

```
The JSON value could not be converted to System.Int32. Path: $.questions[0].difficultyId
```

C# DTO property names, in a toast. And by the time model binding rejects a request, the zod
schema that should have caught it client-side didn't — so it is a **contract bug wearing a
user's error message**, not something the user can act on. `generated` errors get a fixed line
and the real text goes to the console.

`isCustomMessage: true` is still honoured as an explicit override, and is the one way a 5xx can
still be shown. It is never *required*, so the `HandleFailure` contract keeps working without
every other endpoint adopting it.

Every failure is logged with its `kind`, because "why was I shown the generic line?" is the
question that costs the most time.

#### Four error shapes, one reader

| Shape | Produced by | Kind |
|---|---|---|
| `{ message, isCustomMessage }` | `BaseApiController.HandleFailure` / `HandleCustomError` | `isCustomMessage` decides |
| `ProblemDetails { title }` | `GlobalExceptionHandler` — every `AppException` | authored (4xx) |
| A bare JSON string | `BadRequest(ex.Message)` in the older controllers | authored (4xx) |
| `ValidationProblemDetails { errors }` | `[ApiController]` model binding | generated |

The bare string is the one that caused real damage: the old reader only looked at object
properties, so `data?.detail || data?.title || data?.message` was `undefined` three times over
and fell through to axios's own `"Request failed with status code 400"`.

> **Order matters in the reader.** `ValidationProblemDetails` also carries a `title` — "One or
> more validation errors occurred." — so checking titles before `errors` would misfile every
> model-binding 400 as `authored`. `errors` is tested first.

#### Two designs deliberately not taken

**A per-message boolean set at the throw site** (`showToUser: true`). This is the obvious
answer and it is what `isCustomMessage` already is. It fails for two reasons. It is **opt-in**,
so a message without the flag silently degrades to the generic line and nothing about that is
visible in code review, in a test, or in types — which is exactly how the allowlist survived a
year. And it puts a *presentation* decision in a domain service: `QuestionService` should not be
reasoning about toasts. Classifying by the shape the framework produced cannot be forgotten,
because nobody has to remember it.

**A frontend copy table keyed off backend error codes.** This is genuinely better — the client
owns tone, i18n and, most importantly, *the next step* — but only where there is a different
next step to offer. It already exists where it earns its cost: `AiGenerateError` carries
`code: "FeatureDisabled" | "EmailNotVerified" | "QuotaExceeded" | "Unknown"`, and
`GenerateErrorPanel` renders a different action per code (which is why that request sets
`skipErrorToast`). Extend that pattern deliberately, one error at a time, when there is an
action attached. For the long tail, a parallel copy table is a second source of truth that goes
stale, and showing the server's own sentence is better than inventing a worse one.

**The rule:** reach for a code + custom UI when the user needs a *different button*. Otherwise
let the message through and make sure it was written to be read.

> **Prefer `GlobalExceptionHandler` for new failures.** Throw an `AppValidationException` (or
> `NotFoundException` / `ConflictException` / `ForbiddenException`) and let it bubble. You get
> the right status code and a readable body for free. `BadRequest(ex.Message)` is the legacy
> path — it works now that the reader handles strings, but it hard-codes the status at the call
> site and carries no type.
>
> **A controller `catch (Exception)` will swallow that.** `QuizzesController` catches broadly
> and funnels into `HandleCustomError`, which returns **500** for any message outside its own
> pattern list — turning a precise 400 into an opaque server error. Its catches are therefore
> written `catch (Exception ex) when (ex is not AppException)`. Any controller that catches
> broadly needs the same filter, or its typed exceptions never reach the handler.

## The floor: one root `errorElement`

`Router.tsx` wraps every route in a **pathless root route** whose only job is to own
`errorElement`:

```tsx
{
  element: <Outlet />,
  errorElement: <RouteErrorElement />,
  children: [ /* every route in the app */ ],
}
```

Why structural rather than per-route: in a data router, if a route and its ancestors
define no `errorElement`, React Router renders its **own built-in** fallback — the bare
"Unexpected Application Error!" page. Attaching one route by route works right up until
someone adds a route and forgets. A root route can't be forgotten.

Routes with their own `errorElement` still win (`DashboardErrorElement` disguises the
admin area's 404s). The root is the floor, not a ceiling.

> `<ErrorBoundary FallbackComponent={MainErrorFallback}>` in `Provider.tsx` sits
> **outside** `RouterProvider`, so it never sees route errors — the innermost boundary
> wins and React Router's is inner. It still covers everything rendered outside the
> router (providers, `AuthLoader`, theme).

## What `RouteErrorElement` shows

| Case | UI |
|---|---|
| Stale chunk (`ChunkLoadError`, "failed to fetch dynamically imported module") | "A new version is available" + Reload |
| `isRouteErrorResponse` 404 | The app's not-found page |
| Anything else | `MainErrorFallback` — "Something went wrong", Refresh / Go Home |

The stale-chunk case earns its own branch because it's the most common error right after
a deploy: a user with an old tab open requests a hashed bundle that no longer exists. It
is entirely fixed by reloading, so telling them that beats a generic apology.

### Error details: hidden from users, reachable on demand

Normal users never see the underlying error — it's noise at best and a leak at worst. The card
shows the friendly copy and nothing else.

But the console is unreachable on a phone, and on iOS the only official way in is Safari Web
Inspector, which requires a Mac. So `MainErrorFallback` renders a collapsed **"Show error
details"** disclosure in two situations only:

- in development (expanded by default), and
- anywhere, when the URL carries **`?debug=1`**.

That opt-in is what makes a mobile-only crash diagnosable at all. It also carries a **Copy
details** button, because selecting text on a phone is miserable and that text is exactly what
you want to send yourself. Don't remove the `?debug=1` path without wiring up real error
reporting first — the `console.error` in this file is still a `TODO`, so it currently goes
nowhere.

What's exposed stays deliberately narrow: the normalised message, the **first five** stack
frames, and the current URL. No request bodies, no user object, no tokens. `describeError`
normalises whatever was thrown — route errors are typed `unknown`, so a `Response`, a string or
a plain object all have to render as something better than `[object Object]`.

### Sizing

All three error screens (`MainErrorFallback`, `StaleVersionNotice`, `NotFoundContent`) share one
scale: `max-w-xs` and reduced type on phones, stepping up to `max-w-md` and full size at `sm`.
They're rendered in the display font (`getErrorFontClass`), which is large and wide — at full
desktop sizing on a phone the card ran edge to edge and read as a broken page rather than a
message. Keep the three in step if you restyle one.

## What error boundaries do *not* catch

React boundaries only catch errors thrown **during render**. Not covered:

- **Event handlers and mutations.** Mutations don't throw by default (`queryConfig` only
  configures `queries`); the Axios interceptor raises a notification toast instead.
- **`setTimeout` / async callbacks** outside React's call stack.

So "the user never sees a crash page" holds for render-time failures. Failures in
handlers surface as toasts, which is the intended UX — don't "fix" them by throwing.

## Deploy order

Ship the **backend first**. API changes here are additive (new endpoints, new optional
request fields), so an older frontend keeps working against a newer API. Frontend-first
produces 404s on endpoints that don't exist yet — which is exactly what
`?settings=stats` did against an un-updated API before `get-user-quiz-stats` opted out of
throwing.

## Key files

| Concern | File |
|---|---|
| Global query behaviour | `src/lib/React-query.ts` |
| Mutation error toast + `skipErrorToast` | `src/lib/Api-client.ts` |
| Error classification (`parseApiError`, `displayMessageFor`) | `src/lib/Api-client.ts` |
| Typed exceptions → status + `ProblemDetails` | `OxygenBackend/QuizAPI/Middleware/GlobalExceptionHandler.cs` |
| The `AppException` family | `OxygenBackend/QuizAPI/Exeptions/AppExceptions.cs` |
| Legacy `{ message, isCustomMessage }` shape | `OxygenBackend/QuizAPI/Controllers/BaseApiController.cs` |
| Root route error element | `src/pages/UtilityPages/Error/Route-Error-Element.tsx` |
| Friendly crash card | `src/pages/UtilityPages/Error/Main-Error-Boundary.tsx` |
| Dashboard-specific overrides | `src/pages/UtilityPages/Error/Dashboard-Error-Element.tsx` |
| Non-router boundary | `src/Provider.tsx` |
| Route tree / root wrapper | `src/routes/Router.tsx` |
