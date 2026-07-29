# Error Handling

How a failure becomes something the user can act on, and the rules that keep React
Router's raw `Unexpected Application Error!` page (stack trace and all) off the screen.

## The default: queries throw

`src/lib/React-query.ts` sets `throwOnError: true` for **all** queries. A failed query
doesn't return `isError` — it throws during render, into the nearest error boundary.

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

`MainErrorFallback` only prints the message and stack when `import.meta.env.DEV` — in
production users see the friendly card.

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
