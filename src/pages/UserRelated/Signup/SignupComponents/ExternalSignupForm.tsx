import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaGoogle } from "react-icons/fa";
import { BsMicrosoft } from "react-icons/bs";

import Step from "./Step";
import { Label } from "@/components/ui/form";
import { useExternalSignup, type ExternalSignupRequired } from "@/lib/Auth";
import type { ExternalProvider } from "@/lib/auth-config";
import { useNotifications } from "@/common/Notifications";
import {
  useUsernameAvailability,
  MIN_USERNAME_LENGTH,
} from "../api/check-availability";
import type { StepFeedback } from "./SignupSteps";

export type ExternalSignupInfo = ExternalSignupRequired & {
  provider: ExternalProvider;
};

interface ExternalSignupFormProps {
  info: ExternalSignupInfo;
  /** Invite code from the gate; undefined when signup is open. */
  inviteCode?: string;
  /** Server rejected the invite code at submit — return to the invite gate. */
  onBadInviteCode?: () => void;
  /** The 10-minute signup ticket expired — back to the method choice to redo the popup. */
  onTicketExpired: () => void;
  /** Back button — return to the method choice (nothing has been created yet). */
  onBack: () => void;
}

/**
 * The one remaining step of a provider-based signup: pick a username. Email comes verified
 * from the provider (shown, not editable) and there is no password — the identity ticket
 * from external-login carries everything else (docs/auth/social-login-plan.md §5.2, §6).
 */
const ExternalSignupForm: React.FC<ExternalSignupFormProps> = ({
  info,
  inviteCode,
  onBadInviteCode,
  onTicketExpired,
  onBack,
}) => {
  const navigate = useNavigate();
  const { mutate: externalSignup, isPending } = useExternalSignup();
  const [username, setUsername] = useState(info.suggestedUsername ?? "");
  const usernameAvail = useUsernameAvailability(username);

  // Continue numbering from the gate when it ran ("Step 1" was the invite code).
  const stepLabel = inviteCode !== undefined ? "Step 2 of 2" : "Last step";

  const getFeedback = (): StepFeedback => {
    const name = username.trim();
    if (name.length > 0 && name.length < MIN_USERNAME_LENGTH)
      return {
        error: `Username must be at least ${MIN_USERNAME_LENGTH} characters`,
        nextDisabled: true,
      };
    if (usernameAvail.isChecking) return { isChecking: true, nextDisabled: true };
    if (usernameAvail.isTaken)
      return { error: "This username is already taken", nextDisabled: true };
    if (usernameAvail.isAvailable)
      return { success: "Username is available", nextDisabled: isPending };
    if (usernameAvail.isError) return { nextDisabled: isPending };
    return { nextDisabled: true };
  };

  const feedback = getFeedback();

  const submit = () => {
    if (feedback.nextDisabled) return;
    externalSignup(
      {
        signupTicket: info.signupTicket,
        username: username.trim(),
        ...(inviteCode !== undefined ? { inviteCode: inviteCode.trim() } : {}),
      },
      {
        onSuccess: () => {
          useNotifications.getState().addNotification({
            type: "success",
            title: "Welcome!",
            message: "Your account has been created.",
          });
          navigate("/");
        },
        onError: (error: any) => {
          const status = error?.response?.status;
          const data = error?.response?.data;
          const message =
            data?.detail ||
            data?.title ||
            "We couldn't create your account. Please try again.";

          // The ticket lives 10 minutes; past that the provider popup must run again.
          if (status === 401) {
            useNotifications.getState().addNotification({
              type: "error",
              title: "Signup session expired",
              message: "That took a little too long — please start again.",
            });
            onTicketExpired();
            return;
          }

          useNotifications.getState().addNotification({
            type: "error",
            title: "Sign up failed",
            message,
          });
          const lower = String(message).toLowerCase();
          if (lower.includes("invite") || lower.includes("code"))
            onBadInviteCode?.();
          // A username race just stays here — the availability feedback updates.
        },
      }
    );
  };

  return (
    <>
      {/* Which external account this signup is for. */}
      <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 p-3 sm:p-4 mb-5 sm:mb-8">
        {info.provider === "google" ? (
          <FaGoogle className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
        ) : (
          <BsMicrosoft className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
        )}
        <p className="text-xs sm:text-sm text-foreground/80 min-w-0">
          Signing up with{" "}
          <span className="font-semibold text-foreground capitalize">
            {info.provider}
          </span>
          {info.email && (
            <>
              {" "}
              as{" "}
              <span className="font-semibold text-foreground break-all">
                {info.email}
              </span>
            </>
          )}
          . No password needed — just pick a username.
        </p>
      </div>

      <section className="flex flex-col justify-center gap-4 mb-6 sm:gap-6 sm:mb-8">
        <Label className="self-center text-xs font-bold uppercase tracking-widest text-muted-foreground/60">
          {stepLabel}
        </Label>
      </section>

      <form
        className="space-y-4 sm:space-y-6 text-base sm:text-lg min-h-[210px] sm:min-h-[250px] flex flex-col justify-center"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <Step
          label="Username"
          name="username"
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          onNext={submit}
          onBack={onBack}
          isLastStep
          error={feedback.error}
          success={feedback.success}
          isChecking={feedback.isChecking}
          nextDisabled={feedback.nextDisabled}
        />
      </form>
    </>
  );
};

export default ExternalSignupForm;
