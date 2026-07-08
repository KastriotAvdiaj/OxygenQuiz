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
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-background font-quiz">
      {/* Left Side - Background Image with Branding */}
      <div className="relative lg:w-1/2 h-[30vh] lg:h-screen flex items-center justify-center overflow-hidden">
        {/* Background Image */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${OxygenBackground})` }}
        />

        {/* Dark overlay for text readability */}
        <div className="absolute inset-0 bg-black/40" />

        {/* Content */}
        <div className="relative z-10 text-center px-8 space-y-4">
          <div className="transform hover:scale-105 transition-transform duration-300 flex justify-center font-header">
            <O2Button />
          </div>
          <h1 className="text-3xl lg:text-5xl font-bold text-white tracking-tight">
            Welcome Back
          </h1>
          <p className="text-lg lg:text-xl text-white/90 max-w-md mx-auto">
            Sign in to continue your learning journey
          </p>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 lg:w-1/2 flex items-center justify-center p-6 lg:p-12 relative">
        {/* Navigation Controls */}
        <div className="absolute top-6 right-6 flex items-center gap-3">
          <GoBackButton />
          <ModeToggle text={false} />
        </div>

        {/* Form Container */}
        <div className="w-full max-w-md space-y-8">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold text-foreground">Sign In</h2>
            <p className="text-muted-foreground">
              Enter your credentials to access your account
            </p>
          </div>

          {/* Error Message */}
          {isError && (
            <div className="bg-destructive/15 border border-destructive/50 rounded-lg p-4 text-sm text-destructive font-medium animate-in slide-in-from-top-2">
              Login failed. Please check your credentials.
            </div>
          )}

          {/* Form */}
          <LoginForm onLogin={handleLogin} isPending={isPending} />

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-3 text-muted-foreground font-medium">
                Or continue with
              </span>
            </div>
          </div>

          {/* Social Buttons */}
          <SocialButtons />

          {/* Sign Up Link */}
          <p className="text-center text-sm text-muted-foreground">
            Don't have an account?{" "}
            <a
              href="/signup"
              className="text-primary font-semibold hover:underline hover:text-primary/90 transition-colors"
            >
              Sign up
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
