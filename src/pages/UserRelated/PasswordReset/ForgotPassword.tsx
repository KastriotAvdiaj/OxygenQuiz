import { useState } from "react";
import { Link } from "react-router-dom";
import { MailCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useRequestPasswordReset } from "./api/password-reset";
/**
 * `/forgot-password` — ask for a reset link.
 *
 * <b>The success state is deliberately vague, and must stay that way.</b> It says the mail is on
 * its way *if the address is registered*, because the API answers identically for a known and an
 * unknown address: any difference here — a "no account found" message, a different heading, even
 * a spinner that stops sooner — would hand an attacker a way to test whether someone has an
 * account. Resist the very reasonable-sounding request to "just tell them when the email is
 * wrong". See docs/auth/password-reset.md.
 */
export const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const request = useRequestPasswordReset();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || request.isPending) return;
    request.mutate(email.trim());
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-5 rounded-xl border-2 border-primary/20 bg-card p-8 shadow-md">
        {request.isSuccess ? (
          <div className="space-y-4 text-center">
            <MailCheck className="mx-auto h-12 w-12 text-primary" aria-hidden="true" />
            <h1 className="text-2xl font-bold">Check your email</h1>
            <p className="text-muted-foreground">
              If <span className="font-medium text-foreground">{email.trim()}</span> has an
              Oxygen&nbsp;Quiz account, a link to choose a new password is on its way. It expires in
              an hour.
            </p>
            <p className="text-sm text-muted-foreground">
              Nothing arrived? Check spam, then{" "}
              <button
                type="button"
                onClick={() => request.reset()}
                className="underline underline-offset-4 hover:text-foreground"
              >
                try a different address
              </button>
              .
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-2 text-center">
              <h1 className="text-2xl font-bold">Forgot your password?</h1>
              <p className="text-muted-foreground">
                Enter the email you signed up with and we&apos;ll send you a link to set a new one.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="reset-email" className="text-sm font-medium">
                  Email
                </label>
                <input
                  id="reset-email"
                  type="email"
                  required
                  autoComplete="email"
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                />
              </div>

              {/* Only a transport failure reaches here — a wrong address is a success as far as
                  this endpoint is concerned, by design. */}
              {request.isError && (
                <p role="alert" className="text-sm text-destructive">
                  Couldn&apos;t reach the server. Please try again in a moment.
                </p>
              )}

              <Button type="submit" disabled={request.isPending} className="w-full">
                {request.isPending ? "Sending…" : "Send reset link"}
              </Button>
            </form>
          </>
        )}

        <p className="text-center text-sm text-muted-foreground">
          <Link to="/login" className="underline underline-offset-4 hover:text-foreground">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;
