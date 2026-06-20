import { useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { LoadingWave } from "@/components/ui";
import { useUser } from "@/lib/Auth";
import { verifyEmail, useResendVerification } from "./api/email-verification";

/**
 * Landing page for the email-confirmation link (`/confirm-email?token=…`). Fires the verify call
 * once on mount and shows verifying / success / invalid states. On an invalid or expired link a
 * logged-in, still-unconfirmed user can request a fresh one.
 */
export const ConfirmEmail = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: user } = useUser();
  const resend = useResendVerification();

  const verify = useMutation({
    mutationFn: () => verifyEmail(token),
    // Flip the cached user's emailConfirmed so the banner clears on this device.
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["authenticated-user"] }),
    throwOnError: false,
  });

  // Fire exactly once when a token is present (StrictMode double-invokes effects).
  const started = useRef(false);
  useEffect(() => {
    if (token && !started.current) {
      started.current = true;
      verify.mutate();
    }
  }, [token, verify]);

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-5 rounded-xl border-2 border-primary/20 bg-card p-8 text-center">
        {!token ? (
          <>
            <h1 className="text-2xl font-bold">Invalid link</h1>
            <p className="text-muted-foreground">
              This confirmation link is missing its token.
            </p>
          </>
        ) : verify.isPending || verify.isIdle ? (
          <div className="flex flex-col items-center gap-4">
            <LoadingWave size="md" />
            <p className="text-muted-foreground">Confirming your email…</p>
          </div>
        ) : verify.isSuccess ? (
          <>
            <h1 className="text-2xl font-bold text-primary">Email confirmed 🎉</h1>
            <p className="text-muted-foreground">
              Your email is verified — you're all set.
            </p>
            <Button className="w-full" onClick={() => navigate("/")}>
              Continue
            </Button>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold">Link invalid or expired</h1>
            <p className="text-muted-foreground">
              This confirmation link is no longer valid.{" "}
              {user
                ? "Request a fresh one below."
                : "Log in and request a new one from the banner."}
            </p>
            {user && !user.emailConfirmed && (
              <Button
                className="w-full"
                disabled={resend.isPending || resend.isSuccess}
                onClick={() => resend.mutate()}
              >
                {resend.isSuccess
                  ? "Sent — check your inbox"
                  : resend.isPending
                  ? "Sending…"
                  : "Resend confirmation email"}
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ConfirmEmail;
