import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Check, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAuthConfig } from "@/lib/auth-config";
import { resetErrorMessage, useResetPassword } from "./api/password-reset";

/**
 * `/reset-password?token=…` — redeem the link and choose a new password.
 *
 * <b>Unlike the confirm-email page, this does not fire on mount.</b> That page's token is spent by
 * arriving; this one is spent by submitting, and a token that burned itself on a preview fetch or
 * a link-scanning proxy would leave the user holding a dead link and no way back except asking for
 * another. The token travels in the URL and is used only when the form is submitted.
 *
 * The server treats malformed, unknown, expired and already-used tokens identically, so there is
 * one failure message here rather than four — reproducing a distinction the API deliberately does
 * not make would be inventing information.
 */
export const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const reset = useResetPassword();

  // The server's own Auth:MinPasswordLength, delivered by /auth-config, so this form cannot
  // promise a rule the API does not enforce (or refuse one it would have accepted).
  const { minPasswordLength } = useAuthConfig();

  const tooShort = password.length > 0 && password.length < minPasswordLength;
  const mismatch = confirm.length > 0 && password !== confirm;
  const canSubmit =
    password.length >= minPasswordLength && password === confirm && !reset.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    reset.mutate({ token, newPassword: password });
  };

  if (!token) {
    return (
      <Shell>
        <h1 className="text-2xl font-bold">Invalid link</h1>
        <p className="text-muted-foreground">This reset link is missing its token.</p>
        <BackToForgot />
      </Shell>
    );
  }

  if (reset.isSuccess) {
    return (
      <Shell>
        <CheckCircle2 className="mx-auto h-12 w-12 text-primary" aria-hidden="true" />
        <h1 className="text-2xl font-bold">Password changed</h1>
        {/* Every session was signed out server-side, so this is a statement of fact rather than a
            suggestion — say so, or the next login prompt looks like a bug. */}
        <p className="text-muted-foreground">
          You&apos;ve been signed out everywhere else. Sign in with your new password.
        </p>
        <Button className="w-full" onClick={() => navigate("/login")}>
          Go to sign in
        </Button>
      </Shell>
    );
  }

  return (
    <Shell align="left">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Choose a new password</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="new-password" className="text-sm font-medium">
            New password
          </label>
          <input
            id="new-password"
            placeholder="Enter your new password"
            type="password"
            required
            autoComplete="new-password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
          {/* A row of chips rather than a sentence: the rules are short, and the user needs to
              see WHICH one is outstanding at a glance, not read a paragraph. It appears from the
              first keystroke, so an untouched form stays clean. */}
          {password.length > 0 && (
            <ul className="flex flex-wrap gap-x-3 gap-y-1 pt-0.5 text-xs">
              <Requirement met={!tooShort}>{minPasswordLength}+ characters</Requirement>
              <Requirement met={confirm.length > 0 && !mismatch}>Both match</Requirement>
            </ul>
          )}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="confirm-password" className="text-sm font-medium">
            Confirm new password
          </label>
          <input
            id="confirm-password"
            placeholder="Re-enter your new password"
            type="password"
            required
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
          {/* The mismatch state lives in the chip row above, so it isn't said twice. */}
        </div>

        {/* The server's own sentence, not a guess at three possible causes. This is the only
            channel for the common-password rule, which cannot be checked in the browser. */}
        {reset.isError && (
          <p role="alert" className="text-sm text-destructive">
            {resetErrorMessage(reset.error)}
          </p>
        )}

        <Button type="submit" disabled={!canSubmit} className="w-full">
          {reset.isPending ? "Saving…" : "Set new password"}
        </Button>
      </form>

      <BackToForgot />
    </Shell>
  );
};

/**
 * One requirement. Muted until satisfied, then ticked — deliberately never red: an unmet rule on
 * a password someone is still typing is not an error, and colouring it like one makes the form
 * feel hostile three characters in.
 */
const Requirement = ({ met, children }: { met: boolean; children: React.ReactNode }) => (
  <li className={met ? "flex items-center gap-1 text-primary" : "flex items-center gap-1 text-muted-foreground"}>
    <Check className={met ? "h-3 w-3" : "h-3 w-3 opacity-30"} aria-hidden="true" />
    {children}
    <span className="sr-only">{met ? " — met" : " — not yet met"}</span>
  </li>
);

const Shell = ({
  children,
  align = "center",
}: {
  children: React.ReactNode;
  align?: "center" | "left";
}) => (
  <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4">
    <div
      className={
        align === "center"
          ? "w-full max-w-md space-y-5 rounded-xl border-2 border-primary/20 bg-card p-8 text-center shadow-lg"
          : "w-full max-w-md space-y-5 rounded-xl border-2 border-primary/20 bg-card p-8 shadow-lg"
      }
    >
      {children}
    </div>
  </div>
);

const BackToForgot = () => (
  <p className="text-center text-sm text-muted-foreground">
    <Link to="/forgot-password" className="underline underline-offset-4 hover:text-foreground">
      Request a new link
    </Link>
  </p>
);

export default ResetPassword;
