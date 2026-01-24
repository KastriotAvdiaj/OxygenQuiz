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
import { Card } from "@/components/ui";

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
    <div className="min-h-screen w-full flex items-center justify-center relative bg-background overflow-hidden">
      {/* Background Image with Overlay */}
      <div
        className="absolute inset-0 bg-cover bg-center z-0"
        style={{ backgroundImage: `url(${OxygenBackground})` }}
      />
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] z-0" />

      {/* Main Container */}
      <div className="w-full max-w-[90%] md:max-w-md lg:max-w-lg relative z-10">
        
        {/* Navigation Header */}
        <div className="absolute -top-16 left-0 right-0 flex justify-between items-center px-2">
           <GoBackButton />
           <ModeToggle text={false} />
        </div>

        {/* Login Card */}
        <Card className="bg-card/95 backdrop-blur-xl border border-border/50 shadow-2xl rounded-2xl p-6 md:p-10 flex flex-col items-center gap-6">
          
          {/* Logo & Branding */}
          <div className="flex flex-col items-center gap-2">
            <div className="transform hover:scale-105 transition-transform duration-300">
               <O2Button />
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight text-center">
              Welcome Back
            </h2>
          </div>

          {/* Error Message */}
          {isError && (
            <div className="w-full bg-destructive/15 border border-destructive/50 rounded-lg p-3 text-sm text-destructive font-medium text-center animate-in slide-in-from-top-2">
              Login failed. Please check your credentials.
            </div>
          )}

          {/* Form */}
          <LoginForm onLogin={handleLogin} isPending={isPending} />

          {/* Footer Actions */}
          <div className="w-full flex flex-col items-center gap-6 mt-2">
            
            <div className="relative w-full">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-muted" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="px-2 text-muted-foreground font-medium">
                  Or continue with
                </span>
              </div>
            </div>

            <SocialButtons />

            <p className="text-sm text-muted-foreground">
              Don't have an account?{" "}
              <a
                href="/signup"
                className="text-primary font-semibold hover:underline hover:text-primary/90 transition-colors"
              >
                Sign up
              </a>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Login;
