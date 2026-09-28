import React, { useEffect, useRef, useState } from "react";
import { GoogleLogin, GoogleOAuthProvider } from "@react-oauth/google";
import { BsMicrosoft } from "react-icons/bs";
import { FcGoogle } from "react-icons/fc";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAuthConfig, type ExternalProvider } from "@/lib/auth-config";
import {
  useExternalLogin,
  type ExternalSignupRequired,
} from "@/lib/Auth";
import { useNotifications } from "@/common/Notifications";

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
 * Both buttons are ours and styled as a pair; both hand an ID token to the same backend
 * exchange. Google additionally needs GIS's own button to exist, because the ID-token flow
 * only fires from it — see the overlay note below for how the two are reconciled.
 */
const SocialButtons: React.FC<SocialButtonsProps> = ({ onLoggedIn, onNeedsSignup }) => {
  const { google, microsoft } = useAuthConfig();
  const { mutateAsync: externalLogin, isPending } = useExternalLogin();
  const [msPopupOpen, setMsPopupOpen] = useState(false);
  const [googleHover, setGoogleHover] = useState(false);
  const googleWrapper = useRef<HTMLDivElement>(null);

  // Hover over the Google button, from NATIVE pointerenter/pointerleave on the wrapper.
  //
  // Not React's onPointerEnter/onPointerLeave: React emulates those from pointerover/pointerout
  // pairs at the root, and when the pointer leaves through GIS's cross-origin iframe the
  // emulated leave never reached our handler — measured on the live login page (2026-09-26): the
  // native pointerleave fired on the wrapper while React's state stayed `true`. So the button
  // lit up once and then stayed lit, and the next hover looked like no hover at all. Native
  // boundary events on the wrapper are dispatched by the browser itself and do fire correctly.
  // An Effect is the right tool here: it synchronises with the DOM's event system.
  const googleEnabled = google.enabled && !!google.clientId;
  useEffect(() => {
    const el = googleWrapper.current;
    if (!el) return;
    const enter = () => setGoogleHover(true);
    const leave = () => setGoogleHover(false);
    el.addEventListener("pointerenter", enter);
    el.addEventListener("pointerleave", leave);
    return () => {
      el.removeEventListener("pointerenter", enter);
      el.removeEventListener("pointerleave", leave);
    };
  }, [googleEnabled]);

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

  // Shared by both providers so the stack reads as one control group. `border-border` is a
  // deliberate override of the `outline` variant's `border-foreground`: --foreground is
  // near-white in dark mode, which puts a glaring ring on a #121214 page — the exact look
  // this component spent a while getting rid of. --border is the same line the "Or" divider
  // above these buttons uses.
  const providerButtonClass =
    "w-full h-10 rounded border-border text-sm sm:text-base";

  return (
    <div className="flex flex-col w-full justify-center items-center mt-4 sm:mt-6">
      <div className="w-full max-w-[300px] flex flex-col items-center space-y-2.5 sm:space-y-3">
        {google.enabled && google.clientId && (
          <GoogleOAuthProvider clientId={google.clientId}>
            {/*
             * Our own button with GIS's real one laid over it, invisible.
             *
             * WHY, because the obvious reading of this is "someone got clever". GIS renders
             * its button inside a cross-origin iframe from accounts.google.com whose document
             * paints an opaque white fill wider and taller than the button it contains. No
             * stylesheet of ours reaches inside it (every node in the chain computes to
             * rgba(0,0,0,0)), and GIS exposes no way to turn the fill off — `theme` picks
             * between three fills and that is the entire API. Clipping the overflow away
             * worked only while the container happened to land on whole device pixels: on the
             * signup page it landed at 690.297 (dPR 1.25) and one row of white survived the
             * clip. That is not a bug to fix, it is a boundary we do not control, and it moves
             * with content, zoom and DPI. Three separate "fixes" chased it before this.
             *
             * So the button below is ours — it themes, sizes and hovers with the rest of the
             * form — and the GIS button sits on top, all but invisible, to take the click. It is
             * the genuine article, still initialized by GIS and still returning a real ID token
             * through onSuccess, so nothing about the auth flow changes; only the pixels the
             * user sees are ours. opacity (not display/visibility) is load-bearing: a hidden
             * GIS button does not render or fire. And it is 0.01, not 0 — see the layer below.
             *
             * The costs, so nobody rediscovers them as bugs:
             *  - The label is always generic. GIS's personalized "Continue as <name>" is
             *    inside the iframe we are covering, so it cannot be shown. Clicking still
             *    goes straight through to that account.
             *  - Google's branding terms expect their rendered button to be shown as-is.
             *    This is a widely-used pattern but it is a grey area; the sanctioned way out
             *    is the auth-code flow, which needs a client secret and a backend exchange
             *    (docs/auth/social-login.md §8a).
             *  - The visual layer is aria-hidden and untabbable ON PURPOSE. GIS's button is
             *    the real control and keeps its own accessible name and focus behaviour —
             *    low opacity leaves it in the accessibility tree. Do not "fix" this by making
             *    the div below a focusable button; that produces two tab stops for one action.
             */}
            <div
              ref={googleWrapper}
              // Hover is tracked with native listeners on this element (see the Effect above),
              // not `group-hover`: the surface being hovered is a cross-origin iframe, and
              // pointerenter/leave on THIS element's boundary are the events that stay correct
              // while the pointer is over Google's button. cursor-pointer covers any sliver of
              // this box the iframe doesn't — over the iframe itself, Google's page sets it.
              className="relative w-full h-10 cursor-pointer"
            >
              <Button
                type="button"
                variant="outline"
                tabIndex={-1}
                aria-hidden="true"
                className={`${providerButtonClass} pointer-events-none absolute inset-0 ${
                  googleHover ? "bg-muted" : ""
                }`}
              >
                {isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <FcGoogle className="w-5 h-5" />
                )}
                Continue with Google
              </Button>

              {/*
               * opacity 0.01, NOT 0. At exactly 0 Chrome may leave the layer out of the
               * compositor's hit-test data for cross-origin iframes, and events then stop being
               * routed into Google's iframe after the first visit: no pointer cursor (only
               * Google's page can set it over the iframe) and no hover — the "works once, then
               * dead" report of 2026-09-26. 1% of GIS's white fill on our dark page is ~2
               * levels of RGB, which nobody can see. Do not "tidy" this back to opacity-0.
               */}
              <div
                className={`absolute inset-0 overflow-hidden opacity-[0.01] ${
                  isPending ? "pointer-events-none" : ""
                }`}
              >
                <GoogleLogin
                  text="continue_with"
                  // Constant, and now genuinely arbitrary — nothing renders it. Pinning it
                  // still matters: `theme` sits in GoogleLogin's effect deps, so a value tied
                  // to our theme would re-run id.initialize() + id.renderButton() on every
                  // toggle and rebuild the iframe for no reason at all.
                  theme="outline"
                  shape="rectangular"
                  size="large"
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
              </div>
            </div>
          </GoogleOAuthProvider>
        )}

        {microsoft.enabled && microsoft.clientId && (
          <Button
            type="button"
            variant="outline"
            disabled={isPending || msPopupOpen}
            className={providerButtonClass}
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
              <BsMicrosoft className="w-4 h-4" />
            )}
            Continue with Microsoft
          </Button>
        )}
      </div>
    </div>
  );
};

export default SocialButtons;
