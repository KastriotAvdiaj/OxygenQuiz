import { configureAuth } from "react-query-auth";
import { redirect, LoaderFunctionArgs } from "react-router-dom";
import { z } from "zod";
import { api, apiService } from "./Api-client";
import { setAccessToken, clearAccessToken } from "./token-store";
import { AuthResponse, User } from "@/types/user-types";
import { QueryClient } from "@tanstack/react-query";

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

// Mirrors the backend SignupDTO validation: valid email, username 3–50, password 8–128.
export const registerInputSchema = z.object({
  email: z.string().min(1, "Required").email("Invalid email"),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(50, "Username must be at most 50 characters"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must be at most 128 characters"),
});

export type RegisterInput = z.infer<typeof registerInputSchema>;

const registerWithEmailAndPassword = (
  data: RegisterInput
): Promise<AuthResponse> => {
  return apiService.post("Authentication/signup", data);
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
