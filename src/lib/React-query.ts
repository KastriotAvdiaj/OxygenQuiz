import { UseMutationOptions, DefaultOptions } from '@tanstack/react-query';

/**
 * A 401 is not a crash — it means "you are not signed in", which is a normal state for a public
 * page. Everything else still throws to the nearest error boundary (see the note on
 * `throwOnError` below and docs/development/error-handling.md).
 *
 * Without this exemption, one authenticated query mounted in a shared component takes down the
 * whole page for every signed-out visitor. That is exactly what happened: `AccountOverlay` lives
 * in `layout.tsx`, so it renders on every route including `/`, and it calls `useSettingsForm()`
 * before its own `user` check — hooks can't be called conditionally, so the request to the
 * `[Authorize]`'d `GET /api/settings` went out regardless, 401'd, and threw. The home page was
 * never meant to require a login, and the failure is invisible in development because you are
 * almost always signed in.
 *
 * The query still ends in an error state; it just doesn't escalate to the boundary. Callers that
 * genuinely need to react to a 401 can read `isError` as normal.
 */
const isUnauthorized = (error: unknown): boolean =>
  typeof error === 'object' &&
  error !== null &&
  (error as { response?: { status?: number } }).response?.status === 401;

/**
 * How long the three lookup lists — categories, difficulties, languages — stay fresh.
 *
 * The global `staleTime` below is one minute, which is right for quizzes and sessions and wrong
 * for these: they are small, near-static tables an admin edits maybe monthly, and every page
 * with a filter panel loads all three. At one minute, that is a refetch of all three on nearly
 * every navigation, for data that has not changed since the deploy.
 *
 * <b>Freshness comes from invalidation, not expiry.</b> Every create, update and delete on the
 * three entities invalidates its list key, and because the paged search keys are prefixed with
 * the same root (`["questionCategories", "search", …]`) those are evicted by the same call. So
 * an admin renaming a category still sees it immediately — the long window only stops refetches
 * that were never going to return anything different.
 *
 * Not `Infinity`, deliberately: that would also survive a row edited in another tab or by
 * another admin until a mutation happened *in this tab*. An hour bounds that window without
 * giving up the point.
 *
 * See docs/entities/lookup-entities.md.
 */
export const LOOKUP_STALE_TIME = 1000 * 60 * 60;

export const queryConfig = {
    queries: {
      // Queries throw into the nearest error boundary rather than returning `isError` — that's
      // what keeps React Router's raw "Unexpected Application Error!" page off the screen.
      // 401 is the one deliberate exemption.
      throwOnError: (error: unknown) => !isUnauthorized(error),
      refetchOnWindowFocus: false,
      retry: false,
      staleTime: 1000 * 60,
    },
  } satisfies DefaultOptions;
  
  export type ApiFnReturnType<FnType extends (...args: any) => Promise<any>> =
    Awaited<ReturnType<FnType>>;
  
  export type QueryConfig<T extends (...args: any[]) => any> = Omit<
    ReturnType<T>,
    'queryKey' | 'queryFn'
  >;
  
  export type MutationConfig<
    MutationFnType extends (...args: any) => Promise<any>,
  > = UseMutationOptions<
    ApiFnReturnType<MutationFnType>, 
    Error,                          
    Parameters<MutationFnType>[0]   
  >;
  