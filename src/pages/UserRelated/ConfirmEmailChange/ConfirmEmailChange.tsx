import { useNavigate, useSearchParams } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { useUser } from "@/lib/Auth";
import {
  identityErrorMessage,
  useConfirmEmailChange,
} from "@/pages/UserRelated/AccountOverlay/api/account-identity";

/**
 * Landing page for the email-change link (`/confirm-email-change?token=…`), mailed to the NEW
 * address. See docs/auth/account-identity-changes.md.
 *
 * It waits for a click instead of firing on mount, like the reset page and unlike confirm-email:
 * this link moves the account's recovery address, and a mail scanner or link preview that fetched
 * and ran the page must not be what completes that.
 */
export const ConfirmEmailChange = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const navigate = useNavigate();
  const { data: user } = useUser();
  const confirm = useConfirmEmailChange();

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-5 rounded-xl border-2 border-primary/20 bg-card p-8 text-center">
        {!token ? (
          <>
            <h1 className="text-2xl font-bold">Invalid link</h1>
            <p className="text-muted-foreground">This link is missing its token.</p>
          </>
        ) : confirm.isSuccess ? (
          <>
            <h1 className="text-2xl font-bold text-primary">Email changed</h1>
            <p className="text-muted-foreground">
              Sign in with this address from now on. We've let your old address know.
            </p>
            <Button
              className="w-full"
              onClick={() => navigate(user ? "/settings/account" : "/login", { replace: true })}
            >
              {user ? "Back to your account" : "Sign in"}
            </Button>
          </>
        ) : confirm.isError ? (
          <>
            <h1 className="text-2xl font-bold">That didn't work</h1>
            <p className="text-muted-foreground">
              {identityErrorMessage(confirm.error)} You can ask for a new link from your account
              settings.
            </p>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => navigate(user ? "/settings/account" : "/login")}
            >
              {user ? "Go to account settings" : "Sign in"}
            </Button>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold">Confirm your new email</h1>
            <p className="text-muted-foreground">
              Your Oxygen Quiz account will use this address from now on.
            </p>
            <Button
              className="w-full"
              disabled={confirm.isPending}
              isPending={confirm.isPending}
              onClick={() => confirm.mutate(token)}
            >
              Confirm new email
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default ConfirmEmailChange;
