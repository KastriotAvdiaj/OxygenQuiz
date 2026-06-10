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
    }
  ) =>
  async ({ request }: LoaderFunctionArgs): Promise<{ user: User } | Response> => {
    const queryKey = ["authenticated-user"];
    const {
      requiredRoles,
      requiredPermissions,
      redirectPath = "/access-denied",
    } = options || {};

    try {
      let user = queryClient.getQueryData<User>(queryKey);

      if (!user) {
        user = await queryClient.fetchQuery({
          queryKey,
          queryFn: async (): Promise<User> => {
            const userData = await getUser();
            if (!userData) throw new Error("User not authenticated");
            return userData;
          },
          staleTime: 5 * 60 * 1000,
        });
      }

      if (!user) throw new Error("User not authenticated");

      // SuperAdmin bypasses every route gate — its access never depends
      // on the role/permission tables.
      const isSuperAdmin = user.roles?.includes("SuperAdmin") ?? false;

      if (!isSuperAdmin) {
        // Role gate — allow if the user holds ANY required role.
        if (requiredRoles && requiredRoles.length > 0) {
          const ok = requiredRoles.some((r) => user!.roles?.includes(r));
          if (!ok) return redirect(redirectPath);
        }

        // Permission gate — allow if the user holds ANY required permission.
        if (requiredPermissions && requiredPermissions.length > 0) {
          const ok = requiredPermissions.some((p) =>
            user!.permissions?.includes(p)
          );
          if (!ok) return redirect(redirectPath);
        }
      }

      return { user };
    } catch {
      const url = new URL(request.url);
      const returnUrl = url.pathname + url.search;
      return redirect(`/login?redirectTo=${encodeURIComponent(returnUrl)}`);
    }
  };

export const userAuthLoader = createAuthLoader;

export const adminAuthLoader = (queryClient: QueryClient) =>
  createAuthLoader(queryClient, { requiredRoles: ["Admin", "SuperAdmin"] });

export const superAdminAuthLoader = (queryClient: QueryClient) =>
  createAuthLoader(queryClient, { requiredRoles: ["SuperAdmin"] });

// New: gate a route by permission instead of role.
export const permissionAuthLoader = (
  queryClient: QueryClient,
  requiredPermissions: string[]
) => createAuthLoader(queryClient, { requiredPermissions });
