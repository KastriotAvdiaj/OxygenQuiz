import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/form";
import {
  identityErrorMessage,
  useCancelEmailChange,
  useChangeUsername,
  useRequestEmailChange,
  type AccountIdentity,
} from "../api/account-identity";

/**
 * The Username and Email "Edit" dialogs in the Account panel.
 * See docs/auth/account-identity-changes.md.
 *
 * Each form lives in its own component inside `DialogContent`, which Radix unmounts on close —
 * so reopening starts from a clean form without an Effect resetting it.
 */

const formatDay = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });

// ── Username ────────────────────────────────────────────────────────────────────────────────

export const UsernameEditor = ({ identity }: { identity?: AccountIdentity }) => {
  const [open, setOpen] = useState(false);
  const lockedUntil = identity?.nextUsernameChangeAt ?? null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="shrink-0"
          // Locked by the 30-day rule — say until when, rather than a dead button.
          disabled={!identity || !!lockedUntil}
          title={lockedUntil ? `You can change it again on ${formatDay(lockedUntil)}` : undefined}
        >
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-background sm:max-w-md">
        {identity && <UsernameForm identity={identity} onDone={() => setOpen(false)} />}
      </DialogContent>
    </Dialog>
  );
};

const UsernameForm = ({
  identity,
  onDone,
}: {
  identity: AccountIdentity;
  onDone: () => void;
}) => {
  const [name, setName] = useState(identity.username);
  const change = useChangeUsername();

  const trimmed = name.trim();
  // Client check mirrors the API's ChangeUsernameDTO (3–50); the server is the gate, and the
  // "taken" answer can only come from it.
  const lengthOk = trimmed.length >= 3 && trimmed.length <= 50;
  const unchanged = trimmed === identity.username;
  const caseOnly = !unchanged && trimmed.toLowerCase() === identity.username.toLowerCase();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!lengthOk || unchanged) return;
        change.mutate(trimmed, { onSuccess: onDone });
      }}
      className="space-y-4"
    >
      <DialogHeader>
        <DialogTitle>Change your username</DialogTitle>
        <DialogDescription>
          This is the name other players see. You can change it once every 30 days — fixing
          only capital letters doesn't count.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-1.5">
        <label htmlFor="new-username" className="text-sm font-medium">
          Username
        </label>
        <Input
          id="new-username"
          autoComplete="username"
          value={name}
          maxLength={50}
          onChange={(e) => setName(e.target.value)}
          aria-invalid={change.isError}
        />
        <p className="text-xs text-muted-foreground">
          3 to 50 characters. The name you signed up with stays reserved to you, so nobody else
          can take it.
        </p>
        {change.isError && (
          <p role="alert" className="text-sm text-destructive">
            {identityErrorMessage(change.error)}
          </p>
        )}
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={!lengthOk || unchanged || change.isPending}
          isPending={change.isPending}
        >
          {caseOnly ? "Save" : "Change username"}
        </Button>
      </DialogFooter>
    </form>
  );
};

// ── Email ───────────────────────────────────────────────────────────────────────────────────

export const EmailEditor = ({ identity }: { identity?: AccountIdentity }) => {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="shrink-0" disabled={!identity}>
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-background sm:max-w-md">
        {identity && <EmailForm identity={identity} onDone={() => setOpen(false)} />}
      </DialogContent>
    </Dialog>
  );
};

const EmailForm = ({ identity, onDone }: { identity: AccountIdentity; onDone: () => void }) => {
  const [newEmail, setNewEmail] = useState("");
  const [password, setPassword] = useState("");
  const request = useRequestEmailChange();

  // A Google/Microsoft-only account has no password to confirm with. The API refuses it the same
  // way; saying so up front beats a form that can't succeed.
  if (!identity.hasPassword) {
    return (
      <div className="space-y-4">
        <DialogHeader>
          <DialogTitle>Set a password first</DialogTitle>
          <DialogDescription>
            Changing your email needs your password, and your account signs in with Google or
            Microsoft only. Use <strong>Change password</strong> below to set one — we'll email you
            a link — then come back here.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" onClick={onDone}>
            Got it
          </Button>
        </DialogFooter>
      </div>
    );
  }

  if (request.isSuccess) {
    return (
      <div className="space-y-4">
        <DialogHeader>
          <DialogTitle>Check your new inbox</DialogTitle>
          <DialogDescription>
            We sent a confirmation link to{" "}
            <strong className="text-foreground">{newEmail.trim()}</strong>. Your email changes
            when you click it. The link expires in an hour.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" onClick={onDone}>
            Done
          </Button>
        </DialogFooter>
      </div>
    );
  }

  const canSubmit = newEmail.trim().length > 0 && password.length > 0 && !request.isPending;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!canSubmit) return;
        request.mutate({ newEmail: newEmail.trim(), currentPassword: password });
      }}
      className="space-y-4"
    >
      <DialogHeader>
        <DialogTitle>Change your email</DialogTitle>
        <DialogDescription>
          We'll send a link to the new address. Nothing changes until you click it, and your
          current address gets a notice when it does.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-3">
        <div className="space-y-1.5">
          <label htmlFor="new-email" className="text-sm font-medium">
            New email
          </label>
          <Input
            id="new-email"
            type="email"
            autoComplete="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="current-password" className="text-sm font-medium">
            Current password
          </label>
          <Input
            id="current-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {request.isError && (
          <p role="alert" className="text-sm text-destructive">
            {identityErrorMessage(request.error)}
          </p>
        )}
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" disabled={!canSubmit} isPending={request.isPending}>
          Send confirmation link
        </Button>
      </DialogFooter>
    </form>
  );
};

/** Under the Email row while a confirmation link is outstanding. */
export const PendingEmailNotice = ({ pendingEmail }: { pendingEmail: string }) => {
  const cancel = useCancelEmailChange();
  return (
    <div className="-mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 pb-3 text-xs text-muted-foreground">
      <span>
        Waiting for you to confirm{" "}
        <strong className="font-medium text-foreground">{pendingEmail}</strong> — check that
        inbox.
      </span>
      <button
        type="button"
        onClick={() => cancel.mutate()}
        disabled={cancel.isPending}
        className="font-medium text-primary hover:underline disabled:opacity-60"
      >
        Cancel change
      </button>
    </div>
  );
};
