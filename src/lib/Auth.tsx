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

export const authLoader =
  (queryClient: QueryClient) =>
  async (): Promise<{ user: User } | Response> => {
    const queryKey = ["authenticated-user"];

    try {
      let user = queryClient.getQueryData<User>(queryKey);

      if (!user) {
        user = await queryClient.fetchQuery<User>({ queryKey });
      }

      if (!user) {
        throw new Error("User not authenticated");
      }

      if (!(user.role === "Admin" || user.role === "SuperAdmin")) {
        return redirect("/");
      }

      // 4. If all checks pass, return the user data.
      return { user };
    } catch (error) {
      // If getQueryData fails or fetchQuery throws a 401, redirect to login.
      const currentPath = window.location.pathname;
      return redirect(`/login?redirectTo=${encodeURIComponent(currentPath)}`);
    }
  };

// export const AdminRoute = ({ children }: { children: React.ReactNode }) => {
//   const user = useUser();
//   const location = useLocation();

//   if (!user.data) {
//     return (
//       <Navigate
//         to={`/login?redirectTo=${encodeURIComponent(location.pathname)}`}
//         replace
//       />
//     );
//   }
//   if (!(user.data.role === "Admin" || user.data.role === "SuperAdmin")) {
//     return (
//       <div className="h-screen w-full flex items-center justify-center bg-background">
//         <div className="max-w-sm w-full text-center bg-muted shadow-lg rounded-lg p-6">
//           <div className="flex flex-col items-center">
//             <AlertCircle className="text-red-500 w-12 h-12" />
//             <h2 className="mt-4 text-2xl font-semibold text-foreground ">
//               Access Denied
//             </h2>
//             <p className="mt-2 text-foreground">
//               You do not have the necessary permissions to view this page.
//             </p>
//           </div>
//           <div className="mt-4">
//             <LiftedButton className="rounded">
//               <Link to="/">Go back to Home Page</Link>
//             </LiftedButton>
//           </div>
//         </div>
//       </div>
//     );
//   }

//   return <>{children}</>;
// };
