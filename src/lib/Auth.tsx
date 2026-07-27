import { configureAuth } from "react-query-auth";
import { redirect, LoaderFunctionArgs } from "react-router-dom";
import { z } from "zod";
import { api, apiService } from "./Api-client";
import { setAccessToken, clearAccessToken } from "./token-store";
import { AuthResponse, User } from "@/types/user-types";
import {
  QueryClient,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import type { ExternalProvider } from "./auth-config";

export const getUser = async (): Promise<User | null> => {
  try {
    const user: User = (await api.get("Authentication/me")).data;
    if (!user) {
      return null;
    }
    return user;
  } catch (error: any) {
    if (error.response?.status === 401) {
      return null;
    }
    throw error;
  }
};

const logout = async (): Promise<void> => {
  // Revoke the server-side refresh token (clears the HttpOnly cookie too).
  // Best-effort: never block sign-out on a failed call.
  try {
    await api.post("Authentication/logout");
  } catch {
    // ignore
  }
  clearAccessToken();
  window.location.href = "/";
};

export const loginInputSchema = z.object({
  email: z.string().min(1, "Required").email("Invalid email"),
  password: z.string().min(5, "Required"),
});

export type LoginInput = z.infer<typeof loginInputSchema>;

const loginWithEmailAndPassword = (data: LoginInput): Promise<AuthResponse> => {
  return apiService.post("Authentication/login", data);
};

// Mirrors the backend SignupDTO validation: valid email, username 3–50, password 12–128.
// The backend additionally rejects common/breached passwords (NotACommonPassword); that check
// can only run server-side, so a weak-but-long password may still come back as a 400.
export const registerInputSchema = z.object({
  email: z.string().min(1, "Required").email("Invalid email"),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(50, "Username must be at most 50 characters"),
  password: z
    .string()
    .min(12, "Password must be at least 12 characters")
    .max(128, "Password must be at most 128 characters"),
  // Optional here: whether it's required depends on the backend Signup:RequireInviteCode flag,
  // which the signup flow reads via /Authentication/auth-config. The server enforces it on submit.
  inviteCode: z.string().max(64).optional(),
});

export type RegisterInput = z.infer<typeof registerInputSchema>;

const registerWithEmailAndPassword = (
  data: RegisterInput
): Promise<AuthResponse> => {
  // The signup form handles this error itself: it shows the exact, field-specific
  // reason (e.g. "Invalid or already-used invite code.") and bounces the user back
  // to the offending step. Skip the global interceptor toast so we don't stack a
  // second, generic "Error" notification on top of it.
  return apiService.post("Authentication/signup", data, {
    skipErrorToast: true,
  } as any);
};

// Configure auth with react-query-auth
const authConfig = {
  userFn: getUser,
  loginFn: async (data: LoginInput): Promise<User> => {
    const response = await loginWithEmailAndPassword(data);
    if (!response || !response.token) {
      throw new Error("Authentication failed: Token not received");
    }

    // Hold the access token in memory only (no cookie/localStorage).
    setAccessToken(response.token);

    // Use the user data from login response
    if (!response.user) {
      throw new Error("Authentication failed: User data not received");
    }

    return response.user;
  },
  registerFn: async (data: RegisterInput) => {
    const response = await registerWithEmailAndPassword(data);

    if (!response || !response.token) {
      throw new Error("Registration failed: Token not received");
    }

    setAccessToken(response.token);

    // Use the user data from registration response
    if (!response.user) {
      throw new Error("Registration failed: User data not received");
    }

    return response.user;
  },
  logoutFn: logout,
};

export const { useUser, useLogin, useLogout, useRegister, AuthLoader } =
  configureAuth(authConfig);

// ---------------------------------------------------------------------------
// External sign-in (Google / Microsoft) — see docs/auth/social-login-plan.md.
// The provider's JS library hands us an ID token; the backend verifies it and
// either starts a normal session (AuthResponse) or asks for signup completion
// (ExternalSignupRequired, carrying a short-lived ticket).
// ---------------------------------------------------------------------------

/** external-login outcome when the verified identity matches no local account yet. */
export type ExternalSignupRequired = {
  requiresSignup: true;
  signupTicket: string;
  email?: string | null;
  suggestedUsername?: string | null;
};

export type ExternalLoginInput = {
  provider: ExternalProvider;
  idToken: string;
};

export type ExternalSignupInput = {
  signupTicket: string;
  username: string;
  /** Required while the backend Signup:RequireInviteCode flag is on. */
  inviteCode?: string;
};

export const isExternalSignupRequired = (
  response: AuthResponse | ExternalSignupRequired
): response is ExternalSignupRequired =>
  (response as ExternalSignupRequired).requiresSignup === true;

// react-query-auth caches the user under this key (its default); our mutations below
// must write to the same key so useUser picks the session up immediately.
const USER_QUERY_KEY = ["authenticated-user"];

/** Stores the access token and returns the user — the tail end shared by every login path. */
const adoptSession = (response: AuthResponse): User => {
  if (!response?.token) throw new Error("Authentication failed: Token not received");
  if (!response.user) throw new Error("Authentication failed: User data not received");
  setAccessToken(response.token);
  return response.user;
};

/**
 * Exchanges a provider ID token for a session. Resolves with the logged-in User, or with an
 * ExternalSignupRequired payload when the account doesn't exist yet (the caller then routes to
 * the signup-completion step — no session exists at that point).
 * Errors are handled by the caller (skipErrorToast), matching the signup form's convention.
 */
export const useExternalLogin = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      data: ExternalLoginInput
    ): Promise<{ user: User } | { signupRequired: ExternalSignupRequired }> => {
      const response: AuthResponse | ExternalSignupRequired = await apiService.post(
        "Authentication/external-login",
        data,
        { skipErrorToast: true } as any
      );
      if (isExternalSignupRequired(response)) return { signupRequired: response };
      return { user: adoptSession(response) };
    },
    onSuccess: (result) => {
      if ("user" in result) queryClient.setQueryData(USER_QUERY_KEY, result.user);
    },
  });
};

/** Completes a first-time external signup (ticket + username + invite code) and logs in. */
export const useExternalSignup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: ExternalSignupInput): Promise<User> => {
      const response: AuthResponse = await apiService.post(
        "Authentication/external-signup",
        data,
        { skipErrorToast: true } as any
      );
      return adoptSession(response);
    },
    onSuccess: (user) => queryClient.setQueryData(USER_QUERY_KEY, user),
  });
};

export const createAuthLoader =
  (
    queryClient: QueryClient,
    options?: {
      requiredRoles?: string[];
      requiredPermissions?: string[];
      redirectPath?: string;
      /**
       * Hide the route from unauthorized visitors: instead of redirecting to /login or
       * /access-denied (either of which confirms the route exists), serve a 404. Used for the
       * admin dashboard so normal users can't tell its pages are there.
       */
      notFoundOnDenied?: boolean;
    }
  ) =>
  async ({ request }: LoaderFunctionArgs): Promise<{ user: User } | Response> => {
    const queryKey = ["authenticated-user"];
    const {
      requiredRoles,
      requiredPermissions,
      redirectPath = "/access-denied",
      notFoundOnDenied = false,
    } = options || {};

    // Thrown to the route's errorElement, which renders the generic "page not found" — so a hidden
    // route is indistinguishable from one that doesn't exist. statusText "Hidden" lets the dashboard
    // error element tell this apart from an in-dashboard resource-not-found.
    const notFound = () =>
      new Response("Not Found", { status: 404, statusText: "Hidden" });

    // Resolve the current user (from cache, else fetch). Any failure means "not signed in".
    let user = queryClient.getQueryData<User>(queryKey);
    if (!user) {
      try {
        user = await queryClient.fetchQuery({
          queryKey,
          queryFn: async (): Promise<User> => {
            const userData = await getUser();
            if (!userData) throw new Error("User not authenticated");
            return userData;
          },
          staleTime: 5 * 60 * 1000,
        });
      } catch {
        user = undefined;
      }
    }

    if (!user) {
      if (notFoundOnDenied) throw notFound();
      const url = new URL(request.url);
      const returnUrl = url.pathname + url.search;
      return redirect(`/login?redirectTo=${encodeURIComponent(returnUrl)}`);
    }

    // SuperAdmin bypasses every route gate — its access never depends on the role/permission tables.
    const isSuperAdmin = user.roles?.includes("SuperAdmin") ?? false;
    if (!isSuperAdmin) {
      const roleOk =
        !requiredRoles?.length ||
        requiredRoles.some((r) => user!.roles?.includes(r));
      const permissionOk =
        !requiredPermissions?.length ||
        requiredPermissions.some((p) => user!.permissions?.includes(p));

      if (!roleOk || !permissionOk) {
        if (notFoundOnDenied) throw notFound();
        return redirect(redirectPath);
      }
    }

    return { user };
  };

export const userAuthLoader = createAuthLoader;

export const adminAuthLoader = (queryClient: QueryClient) =>
  createAuthLoader(queryClient, {
    requiredRoles: ["Admin", "SuperAdmin"],
    // The admin dashboard is invisible to non-admins: deny with a 404, not access-denied/login.
    notFoundOnDenied: true,
  });

export const superAdminAuthLoader = (queryClient: QueryClient) =>
  createAuthLoader(queryClient, { requiredRoles: ["SuperAdmin"] });

// New: gate a route by permission instead of role.
export const permissionAuthLoader = (
  queryClient: QueryClient,
  requiredPermissions: string[]
) => createAuthLoader(queryClient, { requiredPermissions });
