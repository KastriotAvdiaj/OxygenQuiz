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
  