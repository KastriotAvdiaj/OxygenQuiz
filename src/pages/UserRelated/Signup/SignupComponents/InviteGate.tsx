import React, { useState } from "react";
import { MailPlus } from "lucide-react";

import Step from "./Step";
import { Label } from "@/components/ui/form";
import { useInviteCodeValidity } from "../api/check-availability";
import type { StepFeedback } from "./SignupSteps";

interface InviteGateProps {
  /** Prefill when the user is bounced back here after a submit-time rejection. */
  initialCode?: string;
  /** The code passed the advisory check (or the check was unreachable) — proceed. */
  onPassed: (code: string) => void;
}

/**
 * The first screen of a gated signup: one input, one button, and the invite-only note —
 * deliberately nothing else (docs/auth/social-login-plan.md §6). No signup method (form OR
 * provider button) is reachable before a code is entered, and the header says just "Step 1"
 * with no step-count visuals: how many steps follow depends on the method the user hasn't
 * chosen yet, so a total would be a guess and the progress dots noise.
 *
 * The Continue gate is advisory (same semantics the invite step had inside the old form):
 * a validated code can still lose the consume race at submit, in which case the flow lands
 * back here. An unreachable check never hard-blocks — the server stays the authority.
 */
const InviteGate: React.FC<InviteGateProps> = ({ initialCode = "", onPassed }) => {
  const [code, setCode] = useState(initialCode);
  const inviteValidity = useInviteCodeValidity(code);

  const getFeedback = (): StepFeedback => {
    const trimmed = code.trim();
    if (trimmed.length === 0) return { nextDisabled: true };
    // Wait for the full-length code before judging it, so we don't flash "invalid" mid-type.
    if (!inviteValidity.longEnough) return { nextDisabled: true };
    if (inviteValidity.isChecking) return { isChecking: true, nextDisabled: true };
    if (inviteValidity.isInvalid)
      return {
        error: "This invite code isn't valid or has already been used",
        nextDisabled: true,
      };
    if (inviteValidity.isValid)
      return { success: "Invite code accepted", nextDisabled: false };
    // Couldn't reach the check — don't hard-block; signup still validates and consumes the
    // code atomically and bounces back here if it's actually bad.
    if (inviteValidity.isError) return { nextDisabled: false };
    return { nextDisabled: true };
  };

  const feedback = getFeedback();

  return (
    <>
      {/* Invite-only notice — the "why am I being asked for a code" context. */}
      <div
        role="note"
        className="flex items-start gap-3 rounded-lg border border-primary/30 bg-primary/10 p-3 sm:p-4 mb-5 sm:mb-8"
      >
        <MailPlus
          className="mt-0.5 h-5 w-5 shrink-0 text-primary"
          aria-hidden="true"
        />
        <p className="text-xs sm:text-sm text-foreground/80">
          <span className="font-semibold text-foreground">
            Oxygen Quiz is invite only right now.
          </span>{" "}
          Enter your invite code to create an account.
        </p>
      </div>

      {/* Just "Step 1" — no dots/progress: the number of remaining steps depends on the
          signup method chosen on the next screen. */}
      <section className="flex flex-col justify-center gap-4 mb-6 sm:gap-6 sm:mb-8">
        <Label className="self-center text-xs font-bold uppercase tracking-widest text-muted-foreground/60">
          Step 1
        </Label>
      </section>

      <form
        className="space-y-4 sm:space-y-6 text-base sm:text-lg min-h-[210px] sm:min-h-[250px] flex flex-col justify-center"
        onSubmit={(e) => {
          e.preventDefault();
          if (!feedback.nextDisabled) onPassed(code.trim());
        }}
      >
        <Step
          label="Invite code"
          name="inviteCode"
          type="text"
          placeholder="e.g. K7QM-3FXP-9T"
          value={code}
          // Codes are case- and dash-insensitive server-side; uppercase as the user types.
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          onNext={() => {
            if (!feedback.nextDisabled) onPassed(code.trim());
          }}
          isFirstStep
          error={feedback.error}
          success={feedback.success}
          isChecking={feedback.isChecking}
          nextDisabled={feedback.nextDisabled}
        />
      </form>
    </>
  );
};

export default InviteGate;
