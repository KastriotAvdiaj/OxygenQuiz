import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import SocialButtons from "@/lib/SocialButtons/SocialButtons";
import { ModeToggle } from "@/components/ui/mode-toggle";
import LoginForm from "./LoginForm";

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogin = (email: string, password: string) => {
    // login(); // Simulate login
    const redirectTo = (location.state as { from?: { pathname: string } })?.from?.pathname || "/";
    navigate(redirectTo, { replace: true });
  };

  return (
    <div className="h-screen w-full flex flex-col">
      <div className="relative flex justify-center pt-10">
        <ModeToggle className="absolute top-4 right-4" text={true} />
        <h1 className="text-7xl font-bold text-[var(--text-hover)]">O₂</h1>
      </div>
      <div className="flex-grow flex items-center justify-center">
        <div className="bg-[var(--background-secondary)] p-8 rounded shadow-md w-[50%] max-w-lg flex-grow flex flex-col items-center justify-center">
          <div className="w-[70%]">
            <h2 className="text-3xl font-semibold mb-6 text-center">
              Welcome Back
            </h2>
            <LoginForm onLogin={handleLogin} />
            <div className="text-center mt-4">
              <p className="text-sm">
                Don't have an account?{" "}
                <a href="/signup" className="text-[var(--text-hover)] underline">
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
