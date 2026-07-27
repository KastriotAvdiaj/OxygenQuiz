import React from "react";
import { ArrowLeft, Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import { LiftedButton } from "@/common/LiftedButton";
import SocialButtons from "@/lib/SocialButtons/SocialButtons";
import { useAuthConfig } from "@/lib/auth-config";
import type { ExternalSignupRequired } from "@/lib/Auth";
import type { ExternalProvider } from "@/lib/auth-config";

interface MethodChoiceProps {
  /** Rendered behind the invite gate? Then offer a way back to re-enter the code. */
  onBack?: () => void;
  onChooseManual: () => void;
  onLoggedIn: () => void;
  onNeedsSignup: (
    info: ExternalSignupRequired & { provider: ExternalProvider }
  ) => void;
}

/**
 * The fork after the invite gate (or the first screen when signup is open): create the
 * account manually, or start from a Google/Microsoft account. Provider buttons render here
 * and ONLY here — never before the gate — so an external signup can't begin without an
 * invite code (docs/auth/social-login-plan.md §6).
 *
 * Note the wording on the provider path: clicking a provider button here *starts signup*,
 * but if the provider account already belongs to a user we simply log them in (their invite
 * code stays unspent — the gate only guards account creation).
 */
const MethodChoice: React.FC<MethodChoiceProps> = ({
  onBack,
  onChooseManual,
  onLoggedIn,
  onNeedsSignup,
}) => {
  const { google, microsoft } = useAuthConfig();
  const hasProviders = google.enabled || microsoft.enabled;

  return (
    <div className="flex flex-col min-h-[210px] sm:min-h-[250px]">
      <p className="text-sm sm:text-base text-muted-foreground mb-5 sm:mb-8">
        How would you like to create your account?
      </p>

      <LiftedButton
        type="button"
        className="text-base font-bold shadow-xl"
        outerClassName="w-full h-11"
        onClick={onChooseManual}
      >
        <Mail className="w-4 h-4" />
        Continue with email
      </LiftedButton>

      {hasProviders && (
        <>
          {/* Divider */}
          <div className="relative my-5 sm:my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-3 text-muted-foreground font-medium">
                Or
              </span>
            </div>
          </div>

          <SocialButtons onLoggedIn={onLoggedIn} onNeedsSignup={onNeedsSignup} />
        </>
      )}

      {onBack && (
        <Button
          type="button"
          variant="ghost"
          className="mt-6 self-start text-muted-foreground"
          onClick={onBack}
        >
          <ArrowLeft />
          Use a different invite code
        </Button>
      )}
    </div>
  );
};

export default MethodChoice;
