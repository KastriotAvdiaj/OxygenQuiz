import React, { useState } from "react";
import { GoogleLogin, GoogleOAuthProvider } from "@react-oauth/google";
import { BsMicrosoft } from "react-icons/bs";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAuthConfig, type ExternalProvider } from "@/lib/auth-config";
import {
  useExternalLogin,
  type ExternalSignupRequired,
} from "@/lib/Auth";
import { useNotifications } from "@/common/Notifications";
import { useTheme } from "@/components/ui/theme-provider";

interface SocialButtonsProps {
  /** Called when the provider identity resolved to an account and the user is now logged in. */
  onLoggedIn: () => void;
  /**
   * Called when the identity matches no account: the caller routes to signup completion with
   * the ticket. On the signup page that's the external username step; the login page forwards
   * to /signup. No session exists at this point.
   */
  onNeedsSignup: (info: ExternalSignupRequired & { provider: ExternalProvider }) => void;
}

/**
 * Real "Continue with Google / Microsoft" buttons (docs/auth/social-login-plan.md §6).
 *
 * Renders only the providers enabled in /Authentication/auth-config — an environment with
 * neither configured shows nothing at all (the parent hides its divider via useAuthConfig).
 *
 * Google renders its official GIS button (the ID-token flow requires it); Microsoft is a
 * regular app-styled button opening the MSAL popup. Both hand the resulting ID token to the
 * same backend exchange.
 */
const SocialButtons: React.FC<SocialButtonsProps> = ({ onLoggedIn, onNeedsSignup }) => {
  const { google, microsoft } = useAuthConfig();
  const { mutateAsync: externalLogin, isPending } = useExternalLogin();
  const [msPopupOpen, setMsPopupOpen] = useState(false);
  const { theme } = useTheme();

  if (!google.enabled && !microsoft.enabled) return null;

  const exchange = async (provider: ExternalProvider, idToken: string) => {
    try {
      const result = await externalLogin({ provider, idToken });
      if ("user" in result) onLoggedIn();
      else onNeedsSignup({ ...result.signupRequired, provider });
    } catch (error: any) {
      const data = error?.response?.data;
      useNotifications.getState().addNotification({
        type: "error",
        title: "Sign-in failed",
        message:
          data?.detail ||
          data?.title ||
          "We couldn't sign you in with that account. Please try again.",
      });
    }
  };

  return (
    <div className="flex flex-col w-full justify-center items-center mt-4 space-y-2.5 sm:mt-6 sm:space-y-3">
      {google.enabled && google.clientId && (
        <div className="w-full sm:w-[75%] flex justify-center">
          <GoogleOAuthProvider clientId={google.clientId}>
            <GoogleLogin
              text="continue_with"
              theme={theme === "dark" ? "filled_black" : "outline"}
              width="300"
              onSuccess={(credential) => {
                // `credential` IS the Google ID token — the only thing the backend needs.
                if (credential.credential)
                  void exchange("google", credential.credential);
              }}
              onError={() =>
                useNotifications.getState().addNotification({
                  type: "error",
                  title: "Sign-in failed",
                  message: "Google sign-in didn't complete. Please try again.",
                })
              }
            />
          </GoogleOAuthProvider>
        </div>
      )}

      {microsoft.enabled && microsoft.clientId && (
        <Button
          variant="outline"
          disabled={isPending || msPopupOpen}
          className="w-full sm:w-[75%] rounded h-9 text-sm sm:h-10 sm:text-base"
          onClick={async () => {
            setMsPopupOpen(true);
            try {
              const { acquireMicrosoftIdToken } = await import("./msal");
              const idToken = await acquireMicrosoftIdToken(microsoft.clientId!);
              await exchange("microsoft", idToken);
            } catch {
              // Popup closed or blocked — the user changed their mind; stay quiet.
            } finally {
              setMsPopupOpen(false);
            }
          }}
        >
          {msPopupOpen ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <BsMicrosoft />
          )}
          Continue with Microsoft
        </Button>
      )}
    </div>
  );
};

export default SocialButtons;
