import React from "react";
import { useNavigate } from "react-router-dom";
import SocialButtons from "@/lib/SocialButtons/SocialButtons";
import { ModeToggle } from "@/components/ui/mode-toggle";
import LoginForm from "./LoginForm";
import { useLogin } from "@/lib/Auth";
import { useAuthConfig } from "@/lib/auth-config";
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
  const { google, microsoft } = useAuthConfig();
  const hasProviders = google.enabled || microsoft.enabled;

  const afterLogin = () => {
    useNotifications.getState().addNotification({
      type: "success",
      title: "Success",
      message: "Logged in successfully!",
    });
    const redirectTo = searchParams.get("redirectTo");
    if (redirectTo) navigate(redirectTo, { replace: true });
    else navigate("/", { replace: true });
  };

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
    // Standalone route (no HomeLayout) — it must provide its own scroll
    // container. app-shell-viewport = dynamic viewport height + overflow-y-auto
    // + safe areas; without it html/body (overflow:hidden) made everything past
    // one screen unreachable on phones (docs/RESPONSIVE.md).
    <div className="app-shell-viewport w-full bg-background font-quiz">
      <div className="flex min-h-full w-full flex-col lg:flex-row">
      {/* Left Side - Background Image with Branding.
          Hidden on phones so the form owns the screen without scrolling;
          branding returns from sm up (docs/RESPONSIVE.md). */}
      <div className="relative hidden sm:flex lg:w-1/2 sm:h-[30vh] lg:h-auto lg:self-stretch shrink-0 items-center justify-center overflow-hidden">
        {/* Background Image */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${OxygenBackground})` }}
        />

        {/* Dark overlay for text readability */}
        <div className="absolute inset-0 bg-black/40" />

        {/* Content */}
        <div className="relative z-10 text-center px-6 space-y-2.5 sm:space-y-4">
          <div className="transform hover:scale-105 transition-transform duration-300 flex justify-center font-header">
            <O2Button />
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-5xl font-bold text-white tracking-tight">
            Welcome Back
          </h1>
          <p className="text-base sm:text-lg lg:text-xl text-white/90 max-w-md mx-auto">
            Sign in to continue your learning journey
          </p>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 lg:w-1/2 flex flex-col lg:justify-center px-5 py-4 sm:p-6 lg:p-12 relative">
        {/* Phone/tablet: controls in a static top row — an absolute overlay
            would overlap the heading (see Signup). */}
        <div className="mb-4 flex items-center justify-between lg:hidden">
          <GoBackButton />
          <ModeToggle text={false} />
        </div>
        {/* Desktop: floating controls */}
        <div className="absolute top-6 right-6 hidden lg:flex items-center gap-3">
          <GoBackButton />
          <ModeToggle text={false} />
        </div>

        {/* Form Container — my-auto centers it in the space left after the
            control row; tighter rhythm on phones (docs/RESPONSIVE.md) */}
        <div className="w-full max-w-md space-y-5 sm:space-y-8 mx-auto my-auto">
          <div className="space-y-2">
            <h2 className="text-xl sm:text-3xl font-bold text-foreground">Sign In</h2>
            <p className="text-sm sm:text-base text-muted-foreground">
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

          {/* External sign-in — rendered only when a provider is actually configured. */}
          {hasProviders && (
            <>
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

              {/* Social Buttons. A provider identity with no account yet is sent to the
                  signup flow carrying its ticket — it still passes the invite gate there,
                  it just won't have to redo the provider popup. */}
              <SocialButtons
                onLoggedIn={afterLogin}
                onNeedsSignup={(info) => {
                  useNotifications.getState().addNotification({
                    type: "info",
                    title: "Almost there",
                    message:
                      "That account isn't registered yet — let's finish signing you up.",
                  });
                  navigate("/signup", { state: { external: info } });
                }}
              />
            </>
          )}

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
    </div>
  );
};

export default Login;
