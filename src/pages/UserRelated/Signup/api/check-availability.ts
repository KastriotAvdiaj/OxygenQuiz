import { useQuery } from "@tanstack/react-query";

import { apiService } from "@/lib/Api-client";
import { useDebounce } from "@/hooks/use-debounce";

type AvailabilityResponse = {
  usernameAvailable?: boolean;
  emailAvailable?: boolean;
};

// Mirror the backend rules so we don't fire a request that can't possibly pass.
const MIN_USERNAME_LENGTH = 3;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const fetchAvailability = (
  params: { username: string } | { email: string }
): Promise<AvailabilityResponse> =>
  apiService.get("/Users/availability", { params });

/**
 * Debounced live check for whether a username is free.
 * The query stays disabled until the value is long enough, so we never spam the API
 * while the user is still typing the first couple of characters.
 *
 * Note: `throwOnError: false` overrides the app-wide default (which is `true`). A
 * background uniqueness check must never bubble to an error boundary and crash the
 * page — its failure is handled inline by the caller instead.
 */
export const useUsernameAvailability = (username: string) => {
  const debounced = useDebounce(username.trim(), 400);
  const longEnough = debounced.length >= MIN_USERNAME_LENGTH;

  const query = useQuery({
    queryKey: ["availability", "username", debounced],
    queryFn: () => fetchAvailability({ username: debounced }),
    enabled: longEnough,
    staleTime: 60_000,
    retry: false,
    throwOnError: false,
  });

  return {
    // True only once we have a definitive "free" answer for the current value.
    isAvailable: query.data?.usernameAvailable === true,
    isTaken: query.data?.usernameAvailable === false,
    // "checking" covers both the debounce gap and the in-flight request.
    isChecking:
      longEnough && (query.isFetching || debounced !== username.trim()),
    isError: query.isError,
    longEnough,
  };
};

/** Debounced live check for whether an email is unregistered. */
export const useEmailAvailability = (email: string) => {
  const debounced = useDebounce(email.trim(), 400);
  const validFormat = EMAIL_REGEX.test(debounced);

  const query = useQuery({
    queryKey: ["availability", "email", debounced],
    queryFn: () => fetchAvailability({ email: debounced }),
    enabled: validFormat,
    staleTime: 60_000,
    retry: false,
    throwOnError: false,
  });

  return {
    isAvailable: query.data?.emailAvailable === true,
    isTaken: query.data?.emailAvailable === false,
    isChecking:
      validFormat && (query.isFetching || debounced !== email.trim()),
    isError: query.isError,
    validFormat,
  };
};

export { EMAIL_REGEX, MIN_USERNAME_LENGTH };
