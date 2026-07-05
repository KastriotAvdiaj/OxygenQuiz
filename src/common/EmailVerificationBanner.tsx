import { MailWarning } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useUser } from "@/lib/Auth";
import { useResendVerification } from "@/pages/UserRelated/ConfirmEmail/api/email-verification";

/**
 * Soft-gate nudge: a slim banner shown to logged-in users who haven't confirmed their email yet,
 * with a one-click resend. Renders nothing for anonymous or already-confirmed users, so it's safe
 * to mount globally. See docs/auth/email-verification.md.
 */
export const EmailVerificationBanner = () => {
  const { data: user } = useUser();
  const resend = useResendVerification();

  if (!user || user.emailConfirmed) return null;

  return (
    <div className="bg-primary/10 border-b border-primary/20 text-foreground">
      <div className="container mx-auto flex flex-wrap items-center justify-center gap-x-3 gap-y-1 px-4 py-2 text-sm">
        <MailWarning className="h-4 w-4 shrink-0 text-primary" />
        <span>Please confirm your email to secure your account.</span>
        <Button
          variant="link"
          size="sm"
          className="h-auto p-0 text-primary"
          disabled={resend.isPending || resend.isSuccess}
          onClick={() => resend.mutate()}
        >
          {resend.isSuccess
            ? "Sent — check your inbox"
            : resend.isPending
            ? "Sending…"
            : "Resend email"}
        </Button>
      </div>
    </div>
  );
};
