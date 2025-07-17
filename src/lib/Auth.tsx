import { configureAuth } from "react-query-auth";
import { redirect } from "react-router-dom";
import { z } from "zod";
import { api, apiService } from "./Api-client";
import Cookies from "js-cookie";
import { AUTH_COOKIE } from "./authHelpers";
import { AuthResponse, User } from "@/types/user-types";
import { QueryClient } from "@tanstack/react-query";

const getUser = async (): Promise<User | null> => {
  try {
    const user: User = (await api.get("Authentication/me")).data;
    if (!user) {
      return null;
    }
    return user; // Since `user` is already the data returned from the backend
  } catch (error: any) {
    if (error.response?.status === 401) {
      return null;
    }
    throw error;
  }
};

const logout = (): Promise<void> => {
  return new Promise((resolve) => {
    Cookies.remove(AUTH_COOKIE);
    window.location.href = "/";
    resolve();
  });
};

export const loginInputSchema = z.object({
  email: z.string().min(1, "Required").email("Invalid email"),
  password: z.string().min(5, "Required"),
});

export type LoginInput = z.infer<typeof loginInputSchema>;
const loginWithEmailAndPassword = (data: LoginInput): Promise<AuthResponse> => {
  return apiService.post("Authentication/login", data);
};

export const registerInputSchema = z
  .object({
    email: z.string().min(1, "Required"),
    firstName: z.string().min(1, "Required"),
    lastName: z.string().min(1, "Required"),
    password: z.string().min(1, "Required"),
  })
  .and(
    z
      .object({
        teamId: z.string().min(1, "Required"),
        teamName: z.null().default(null),
      })
      .or(
        z.object({
          teamName: z.string().min(1, "Required"),
          teamId: z.null().default(null),
        })
      )
  );

export type RegisterInput = z.infer<typeof registerInputSchema>;

const registerWithEmailAndPassword = (
  data: RegisterInput
): Promise<AuthResponse> => {
  return api.post("/auth/register", data);
};

// Configure auth with react-query-auth
const authConfig = {
  userFn: getUser,
  loginFn: async (data: LoginInput): Promise<User> => {
    const response = await loginWithEmailAndPassword(data);
    if (!response || !response.token) {
      throw new Error("Authentication failed: Token not received");
    }
    Cookies.set(AUTH_COOKIE, response.token, {
      secure: true, // Use HTTPS
      sameSite: "strict", // CSRF protection
      expires: 1, // Token expiration in days
    });
    return response.user;
  },
  registerFn: async (data: RegisterInput) => {
    const response = await registerWithEmailAndPassword(data);
    return response.user;
  },
  logoutFn: logout,
};

export const { useUser, useLogin, useLogout, useRegister, AuthLoader } =
  configureAuth(authConfig);

export const createAuthLoader =
  (
    queryClient: QueryClient,
    options?: { requiredRoles?: string[]; redirectPath?: string }
  ) =>
  async (): Promise<{ user: User } | Response> => {
    const queryKey = ["authenticated-user"];
    const { requiredRoles, redirectPath = "/access-denied" } = options || {};

    try {
      let user = queryClient.getQueryData<User>(queryKey);

      if (!user) {
        user = await queryClient.fetchQuery<User>({ queryKey });
      }

      if (!user) {
        throw new Error("User not authenticated");
      }

      // Check roles if specified
      if (requiredRoles && requiredRoles.length > 0) {
        if (!requiredRoles.includes(user.role)) {
          return redirect(redirectPath);
        }
      }

      return { user };
    } catch (error) {
      const currentPath = window.location.pathname;
      return redirect(`/login?redirectTo=${encodeURIComponent(currentPath)}`);
    }
  };

// Usage examples:
export const userAuthLoader = createAuthLoader;
export const adminAuthLoader = (queryClient: QueryClient) =>
  createAuthLoader(queryClient, { requiredRoles: ["Admin", "SuperAdmin"] });
export const superAdminAuthLoader = (queryClient: QueryClient) =>
  createAuthLoader(queryClient, { requiredRoles: ["SuperAdmin"] });
