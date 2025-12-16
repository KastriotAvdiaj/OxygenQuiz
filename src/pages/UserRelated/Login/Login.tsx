import React from "react";
import { useNavigate } from "react-router-dom";
import SocialButtons from "@/lib/SocialButtons/SocialButtons";
import { ModeToggle } from "@/components/ui/mode-toggle";
import LoginForm from "./LoginForm";
import { useLogin } from "@/lib/Auth";
import { GoBackButton } from "@/common/Go-Back-Button";
import { useSearchParams } from "react-router-dom";
import { O2Button } from "@/common/O2Button";
import { useNotifications } from "@/common/Notifications";
import OxygenBackground from "/assets/oxygenquiz2.jpg";

/**
 *
 * @LoginPage
 *
 */

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { mutate: login, isPending, isError } = useLogin();

  const handleLogin = async (email: string, password: string) => {
    try {
      await login(
        { email, password },
        {
          onSuccess: () => {
            useNotifications.getState().addNotification({
              type: "success",
              title: "Success",
              message: "Logged in successfully!",
            });
            const redirectTo = searchParams.get("redirectTo");
            if (redirectTo) {
              navigate(redirectTo, { replace: true });
            } else {
              navigate(-1);
            }
          },
          onError: (error: unknown) => {
            console.error("Login failed:", error);
          },
        }
      );
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  return (
    <div className="relative h-screen w-full flex flex-col">
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${OxygenBackground})` }}
      />

      {/* Dark Overlay for better contrast */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Content Container */}
      <div className="relative h-full w-full flex flex-col">
        <div className="relative flex justify-center pt-10">
          <div className="absolute top-4 flex justify-between gap-5 w-full px-5">
            <GoBackButton />
            <ModeToggle text={true} />
          </div>
          <O2Button />
        </div>

        <div className="flex-grow flex items-center justify-center z-20">
          {/* Form container with semi-transparent background */}
          <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-md p-8 rounded-lg shadow-2xl max-w-lg w-full mx-4">
            <div className="w-full">
              <h2 className="text-3xl font-semibold mb-6 text-center text-gray-900 dark:text-white">
                Welcome Back
              </h2>
              {isError && (
                <p className="text-red-600 dark:text-red-400 font-semibold py-2 text-center">
                  Login failed. Please try again.
                </p>
              )}
              <LoginForm onLogin={handleLogin} isPending={isPending} />
              <div className="text-center mt-4">
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  Don't have an account?{" "}
                  <a
                    href="/signup"
                    className="text-blue-600 dark:text-blue-400 underline hover:text-blue-700 dark:hover:text-blue-300">
                    Sign up
                  </a>
                </p>
              </div>
              <div className="relative mt-8">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-white dark:bg-gray-900 px-2 text-gray-600 dark:text-gray-400">
                    OR
                  </span>
                </div>
              </div>
              <SocialButtons />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
