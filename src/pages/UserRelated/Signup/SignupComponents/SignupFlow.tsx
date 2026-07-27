import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

import InviteGate from "./InviteGate";
import MethodChoice from "./MethodChoice";
import SignupForm from "./SignupForm";
import ExternalSignupForm, { type ExternalSignupInfo } from "./ExternalSignupForm";
import { useAuthConfig } from "@/lib/auth-config";
import { useNotifications } from "@/common/Notifications";

/**
 * The signup flow's stages. While signup is invite-gated the order is strict:
 *
 *   invite ──► method ──► manual (email/password form)
 *                   └───► external (Google/Microsoft, username only)
 *
 * The invite gate ALWAYS comes first when the gate is on — no signup method (including the
 * provider buttons) is reachable before a valid code, so an external signup can't start
 * without an invite (docs/auth/social-login-plan.md §6). With the gate off, `method` is the
 * first screen. Each stage change re-mounts the stage wrapper (key={stage}), which plays the
 * slide-in animation the "next page" effect calls for.
 */
type Stage = "invite" | "method" | "manual" | "external";

/** Login page forwards a provider identity that needs an account via router state. */
type ForwardedExternal = { external?: ExternalSignupInfo };

const SignupFlow: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { requireInviteCode, isLoading } = useAuthConfig();

  // A provider sign-in attempted on the LOGIN page that found no account lands here with its
  // ticket, so the user doesn't redo the popup — they still pass the invite gate first.
  const forwarded = (location.state as ForwardedExternal | null)?.external;

  const [stage, setStage] = useState<Stage | null>(null);
  const [inviteCode, setInviteCode] = useState<string | undefined>(undefined);
  const [external, setExternal] = useState<ExternalSignupInfo | undefined>(forwarded);

  // Resolve the initial stage once the config arrives (isLoading flips exactly once; a brief
  // spinner beats flashing the method screen and then swapping the gate in).
  if (isLoading || stage === null) {
    if (!isLoading && stage === null) {
      if (requireInviteCode) setStage("invite");
      else setStage(external ? "external" : "method");
    }
    return (
      <div className="flex justify-center py-16" aria-busy="true">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const loggedIn = () => {
    useNotifications.getState().addNotification({
      type: "success",
      title: "Success",
      message: "Logged in successfully!",
    });
    navigate("/");
  };

  // Bad code reported at submit time (spent/revoked since the advisory check): back to the
  // gate with the stale code prefilled so the user sees what to replace.
  const backToInvite = () => setStage("invite");

  const stageContent = (): React.ReactNode => {
    switch (stage) {
      case "invite":
        return (
          <InviteGate
            initialCode={inviteCode}
            onPassed={(code) => {
              setInviteCode(code);
              // A provider identity forwarded from /login skips the fork — its popup already ran.
              setStage(external ? "external" : "method");
            }}
          />
        );

      case "method":
        return (
          <MethodChoice
            onBack={requireInviteCode ? backToInvite : undefined}
            onChooseManual={() => setStage("manual")}
            onLoggedIn={loggedIn}
            onNeedsSignup={(info) => {
              setExternal(info);
              setStage("external");
            }}
          />
        );

      case "manual":
        return (
          <SignupForm
            inviteCode={requireInviteCode ? inviteCode : undefined}
            onBadInviteCode={backToInvite}
            onExit={() => setStage("method")}
          />
        );

      case "external":
        return (
          <ExternalSignupForm
            info={external!}
            inviteCode={requireInviteCode ? inviteCode : undefined}
            onBadInviteCode={backToInvite}
            onTicketExpired={() => {
              setExternal(undefined);
              setStage("method");
            }}
            onBack={() => setStage("method")}
          />
        );
    }
  };

  return (
    // Re-mounting on stage change plays the entrance animation — the next "page" slides up.
    <div
      key={stage}
      className="animate-in fade-in slide-in-from-bottom-4 duration-300"
    >
      {stageContent()}
    </div>
  );
};

export default SignupFlow;
