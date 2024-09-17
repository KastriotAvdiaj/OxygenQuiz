import React from "react";
import { useNavigate } from "react-router-dom";
import SocialButtons from "@/lib/SocialButtons/SocialButtons";
import { ModeToggle } from "@/components/ui/mode-toggle";
import LoginForm from "./LoginForm";
import { useLogin } from "@/lib/Auth";
import { GoBackButton } from "@/common/Go-Back-Button";
import { useSearchParams } from "react-router-dom";
import { Spinner } from "@/components/ui/Spinnter";
import { O2Button } from "@/common/O2Button";
/**
 *
 * @LoginPage '
 *
 */

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { mutate: login, isLoading, isError } = useLogin();

  const handleLogin = async (email: string, password: string) => {
    try {
      await login(
        { email, password },
        {
          onSuccess: () => {
            const redirectTo = searchParams.get("redirectTo");
            navigate(`${redirectTo ? `${redirectTo}` : "/dashboard"}`, {
              replace: true,
            });
          },
          onError: (error: unknown) => {
            console.error("Login failed:", error);
            alert("Login failed. Please try again.");
          },
        }
      );
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  return (
    <div className="h-screen w-full flex flex-col">
      <div className="relative flex justify-center pt-10">
        <div className="absolute top-4 flex justify-between gap-5 w-full px-5">
          <GoBackButton className="bg-white text-center w-48 rounded-xl h-9 font-sans relative textblack text-sm font-semibold group" />
          <ModeToggle text={true} />
        </div>

        <O2Button />
      </div>
      <div className="flex-grow flex items-center justify-center">
        <div className="bg-[var(--background-secondary)] p-8 rounded shadow-md w-[50%] max-w-lg flex-grow flex flex-col items-center justify-center">
          <div className="w-[70%]">
            <h2 className="text-3xl font-semibold mb-6 text-center">
              Welcome Back
            </h2>
            {isError && (
              <p className="text-red-500 font-semibold py-2">
                Login failed. Please try again.
              </p>
            )}{" "}
            <LoginForm onLogin={handleLogin} />
            {isLoading && <Spinner size="sm" />}
            <div className="text-center mt-4">
              <p className="text-sm">
                Don't have an account?{" "}
                <a
                  href="/signup"
                  className="text-[var(--text-hover)] underline"
                >
                  Sign up
                </a>
              </p>
            </div>
            <div className="relative mt-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-[var(--background-secondary)] px-2">
                  OR
                </span>
              </div>
            </div>
            <SocialButtons />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
