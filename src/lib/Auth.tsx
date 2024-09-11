import { configureAuth } from "react-query-auth";
import { Navigate, useLocation } from "react-router-dom";
import { z } from "zod";
import { api } from "./Api-client";
import { AuthResponse, User } from "@/types/ApiTypes";

const getUser = async (): Promise<User | null> => {
  try {
    const response = await api.get("Authentication/me");
    if (!response.data) {
      return null;
    }

    return response.data;
  } catch (error: any) {
    if (error.response?.status === 401) {
      return null;
    }
    throw error;
  }
};

const logout = (): Promise<void> => {
  return api.post("/auth/logout");
};

export const loginInputSchema = z.object({
  email: z.string().min(1, "Required").email("Invalid email"),
  password: z.string().min(5, "Required"),
});

export type LoginInput = z.infer<typeof loginInputSchema>;

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
