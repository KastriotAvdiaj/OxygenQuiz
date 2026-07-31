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
logged-out 401 is a normal state, not an error).

Keep throwing for data the screen is *about* — a quiz page with no quiz has nothing to
render.

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
| Root route error element | `src/pages/UtilityPages/Error/Route-Error-Element.tsx` |
| Friendly crash card | `src/pages/UtilityPages/Error/Main-Error-Boundary.tsx` |
| Dashboard-specific overrides | `src/pages/UtilityPages/Error/Dashboard-Error-Element.tsx` |
| Non-router boundary | `src/Provider.tsx` |
| Route tree / root wrapper | `src/routes/Router.tsx` |
