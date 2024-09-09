import { UseMutationOptions, DefaultOptions } from '@tanstack/react-query';

// This file provides global configurations and types for API calls and mutations using TanStack Query (react-query).
// It helps streamline the process of managing server-state in the app by ensuring consistency in queries and mutations
// and making the API call responses type-safe across the application.

// The `queryConfig` object is a global configuration for react-query's query behavior.
// It satisfies the `DefaultOptions` type, ensuring the correct structure for query settings.
// - `refetchOnWindowFocus: false`: Disables refetching data when the user focuses back on the window.
// - `retry: false`: Prevents automatic retries when queries fail.
// - `staleTime: 1000 * 60`: Sets how long data is considered fresh (1 minute in this case).
export const queryConfig = {
    queries: {
      // Uncommenting `throwOnError` would allow errors to be thrown instead of handled within query callbacks.
      throwOnError: true, 
      refetchOnWindowFocus: false, // Prevents refetching when the window is refocused, reducing unnecessary network requests.
      retry: false, // Disables automatic retries for failed requests.
      staleTime: 1000 * 60, // Data will be considered fresh for 1 minute before becoming stale.
    },
  } satisfies DefaultOptions; // Ensures that the config matches the expected shape defined by TanStack Query.
  
  // `ApiFnReturnType` is a utility type that extracts the awaited return type of an async function (API function).
  // It allows you to infer the correct return type of any API function used in the app for better type safety.
  export type ApiFnReturnType<FnType extends (...args: any) => Promise<any>> =
    Awaited<ReturnType<FnType>>;
  
  // `QueryConfig` defines the shape of the query configuration for a specific API function.
  // By omitting the 'queryKey' and 'queryFn', it allows for customization of other configuration options.
  // This type is useful for configuring react-query hooks that fetch data, ensuring flexibility while excluding mandatory fields.
  export type QueryConfig<T extends (...args: any[]) => any> = Omit<
    ReturnType<T>,
    'queryKey' | 'queryFn'
  >;
  
  // `MutationConfig` defines a type-safe configuration for API mutations.
  // It uses `UseMutationOptions` from react-query, and infers the mutation function's return type (`ApiFnReturnType`).
  // - `MutationFnType`: The mutation function (async API call).
  // - The config includes the inferred API call's result, error type, and input parameters for the mutation hook.
  // This ensures that mutations have proper type checking and error handling in place when used in the app.
  export type MutationConfig<
    MutationFnType extends (...args: any) => Promise<any>,
  > = UseMutationOptions<
    ApiFnReturnType<MutationFnType>, // Return type of the mutation function.
    Error,                          // Error type expected from the mutation.
    Parameters<MutationFnType>[0]    // Input parameters expected by the mutation function.
  >;
  