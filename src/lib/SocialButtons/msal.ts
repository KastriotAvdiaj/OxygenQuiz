import {
  PublicClientApplication,
  type AuthenticationResult,
} from "@azure/msal-browser";

/**
 * Lazily-created MSAL instance for "Sign in with Microsoft".
 *
 * The client id arrives at runtime from /Authentication/auth-config (it's public, but only
 * configured environments have one), so the instance can't be built at module load — it is
 * created on first use and cached per client id.
 *
 * The authority pins the backend's tenant choice ("consumers" = personal Microsoft accounts;
 * see docs/auth/social-login-plan.md §4). If the backend ever widens to org accounts, this
 * authority and the app registration change together.
 */
const AUTHORITY = "https://login.microsoftonline.com/consumers";
const LOGIN_SCOPES = ["openid", "profile", "email"];

let cached: { clientId: string; instance: PublicClientApplication } | null = null;

const getMsalInstance = async (clientId: string): Promise<PublicClientApplication> => {
  if (cached?.clientId === clientId) return cached.instance;

  const instance = new PublicClientApplication({
    auth: {
      clientId,
      authority: AUTHORITY,
      // The SPA redirect URI registered in the Entra app registration. The popup flow
      // returns to this origin; no route handling is needed.
      redirectUri: window.location.origin,
    },
    cache: {
      // We only need the popup's ID token once (the backend runs its own sessions), so
      // don't persist provider tokens anywhere JS-readable.
      cacheLocation: "memoryStorage",
    },
  });
  await instance.initialize();

  cached = { clientId, instance };
  return instance;
};

/**
 * Opens the Microsoft login popup and resolves with the raw ID token to send to the backend.
 * Throws on popup closure/failure — callers treat that as "nothing happened".
 */
export const acquireMicrosoftIdToken = async (clientId: string): Promise<string> => {
  const instance = await getMsalInstance(clientId);
  const result: AuthenticationResult = await instance.loginPopup({
    scopes: LOGIN_SCOPES,
    prompt: "select_account",
  });
  if (!result.idToken) throw new Error("Microsoft sign-in returned no ID token.");
  return result.idToken;
};
