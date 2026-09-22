// The session hint — a readable cookie that says "this browser has a session worth resuming".
//
// Why it exists: the access token lives only in memory (token-store.ts), so every page load
// starts without one, and the refresh token is in an HttpOnly cookie that JavaScript cannot see.
// Without a hint, the only way to learn whether the visitor is signed in is to ask the server —
// and the whole app waits behind AuthLoader while it does. For a first-time visitor that wait
// always ends in "nobody", so it is pure cost, paid on the very first screen they ever see.
//
// The backend sets `has_session=1` next to the refresh cookie on every login, signup, external
// sign-in and refresh, with the same expiry, and clears both on logout. Reading it tells us
// whether calling /Authentication/refresh can possibly succeed:
//
//   - absent  → no session. Skip the network entirely; the app renders immediately.
//   - present → probably a session. Call /refresh (one round trip) to confirm and resume it.
//
// It is a hint, not a credential: it holds no secret, grants nothing, and forging it only buys
// the forger a 401. The one rule that keeps it safe is that it may be wrong in the "present"
// direction (costs one wasted request) but must never be wrong in the "absent" direction (a
// signed-in user would look signed out, and nothing would ever ask the server again). That is
// why the frontend only ever READS it — deleting it is the backend's call alone.
//
// The cookie name is mirrored in Controllers/Authentication/Authentication.cs
// (SessionHintCookieName). See docs/auth/session-hint.md and ADR 0016.

const SESSION_HINT_COOKIE = "has_session";

/** True when the backend has marked this browser as holding a resumable session. */
export const hasSessionHint = (): boolean => {
  if (typeof document === "undefined") return false;
  return document.cookie
    .split(";")
    .some((pair) => pair.trim().startsWith(`${SESSION_HINT_COOKIE}=1`));
};
