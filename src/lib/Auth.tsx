import { configureAuth } from "react-query-auth";
import { Navigate, useLocation } from "react-router-dom";
import { z } from "zod";
import { api } from "./Api-client";
import { AuthResponse, User } from "@/types/ApiTypes";
import Cookies from "js-cookie";
import { AUTH_COOKIE } from "./authHelpers";

const getUser = async (): Promise<User | null> => {
  try {
    const user: User = await api.get("Authentication/me");  // No need for `response.data` here
    console.log(user);
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
  Cookies.remove(AUTH_COOKIE);
  return api.post("/auth/logout");
};

export const loginInputSchema = z.object({
  email: z.string().min(1, "Required").email("Invalid email"),
  password: z.string().min(5, "Required"),
});

export type LoginInput = z.infer<typeof loginInputSchema>;

/**
 * Logs in a user using their email and password.
 * @param data - The login data containing the email and password.
 * @returns The user object if the login is successful.
 */
const loginWithEmailAndPassword = (data: LoginInput): Promise<AuthResponse> => {
  return api.post("Authentication/login", data);
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
  /**
   * Logs in a user using their email and password.
   * @param data - The login data containing the email and password.
   * @returns The user object if the login is successful.
   */
  loginFn: async (data: LoginInput): Promise<User> => {
    const response = await loginWithEmailAndPassword(data);
    console.log(response);
    if (!response || !response.token) {
      throw new Error("Authentication failed: Token not received");
    }
    Cookies.set(AUTH_COOKIE, response.token, {
      secure: true, // Use HTTPS
      sameSite: "strict", // CSRF protection
      expires: 1, // Token expiration in days
    });
    console.log(response);
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

// ProtectedRoute component using useUser hook
export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const user = useUser();
  console.log(user);
  const location = useLocation();

  if (!user.data) {
    return (
      <Navigate
        to={`/login?redirectTo=${encodeURIComponent(location.pathname)}`}
        replace
      />
    );
  }

  return <>{children}</>;
};
