// In-memory access-token store.
//
// The JWT access token is kept ONLY in this module variable — never in a cookie or
// localStorage. That way a cross-site-scripting (XSS) bug has no persisted token to
// read and exfiltrate; the worst it can reach is the value held in this tab's memory,
// which is gone the moment the tab closes or reloads.
//
// On reload the token starts null. The first authenticated request 401s, the response
// interceptor in Api-client.ts silently calls /Authentication/refresh (using the
// HttpOnly refresh cookie), repopulates this store, and replays the request — so the
// user stays logged in without the token ever touching JS-readable storage.

let accessToken: string | null = null;

export const getAccessToken = (): string | null => accessToken;

export const setAccessToken = (token: string | null): void => {
  accessToken = token;
};

export const clearAccessToken = (): void => {
  accessToken = null;
};
