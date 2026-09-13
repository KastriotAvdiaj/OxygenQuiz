import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/form";
import { useNotifications } from "@/common/Notifications";
import { useLogout, useUser } from "@/lib/Auth";
import { useCloseMyAccount } from "../api/account-closure";

/**
 * "Close my account", at the bottom of the account panel.
 *
 * <p>This is the only way a person can leave — the Users dashboard deliberately refuses
 * self-deletion, because that endpoint is the administrative tool (ADR 0011). It is also the
 * only exit an Admin has. See docs/auth/account-closure.md.</p>
 *
 * <p>Three deliberate frictions, in increasing order of how much they matter:</p>
 * <ul>
 *   <li><b>Typing your username to confirm.</b> A destructive action reached by two clicks is
 *     reached by accident; one that needs you to read your own name off the screen and type it
 *     is not. Standard for this class of action, and the cost is a few seconds on a decision
 *     people take once.</li>
 *   <li><b>The date is shown before you commit, not after.</b> "Recoverable for 30 days" is the
 *     single fact that makes this decision reversible, so it belongs where the decision is made.</li>
 *   <li><b>Signing out immediately.</b> The account is soft-deleted the moment the request
 *     succeeds, so every authenticated read starts 404-ing. Staying on the page would show a
 *     broken app rather than a clean goodbye.</li>
 * </ul>
 */
export const CloseAccountSection = () => {
  const { data: user } = useUser();
  const logout = useLogout();
  const { addNotification } = useNotifications();

  const [open, setOpen] = useState(false);
  const [typedName, setTypedName] = useState("");

  const username = user?.username ?? "";
  // Case-insensitive and trimmed: this is a confirmation, not a password. Rejecting "Kastriot"
  // for "kastriot" would read as a bug, and it guards against nothing.
  const confirmed =
    typedName.trim().toLowerCase() === username.toLowerCase() && username.length > 0;

  const closeAccount = useCloseMyAccount({
    mutationConfig: {
      onSuccess: (data) => {
        addNotification({
          type: "success",
          title: "Account closed",
          message: `You can restore it by signing in before ${new Date(
            data.anonymiseAt
          ).toLocaleDateString()}.`,
        });
        setOpen(false);
        logout.mutate({});
      },
      onError: () => {
        addNotification({
          type: "error",
          title: "Couldn't close your account",
          message: "Please try again, or contact support if this keeps happening.",
        });
      },
    },
  });

  // Protected accounts (the seeded root admin, the guest placeholder) can never be closed —
  // the API refuses, so offering the button would only produce a 403. ADR 0011.
  if (user?.isProtected) return null;

  return (
    <section className="rounded-xl border border-destructive/40 bg-card px-4">
      <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium">Close your account</p>
          <p className="text-xs text-muted-foreground">
            Your account is hidden straight away and permanently erased after 30 days. Sign
            back in before then to restore it.
          </p>
        </div>

        <ConfirmationDialog
          isOpen={open}
          onOpenChange={(next) => {
            setOpen(next);
            // Clear on every close, not just on cancel: leaving the name typed in means the
            // next open is one click from irreversible.
            if (!next) setTypedName("");
          }}
          icon="danger"
          title="Close your account?"
          triggerButton={
            <Button variant="destructive" size="sm" className="shrink-0">
              Close account
            </Button>
          }
          confirmButton={
            <Button
              variant="destructive"
              type="button"
              disabled={!confirmed || closeAccount.isPending}
              isPending={closeAccount.isPending}
              onClick={() => closeAccount.mutate(undefined)}
            >
              Close my account
            </Button>
          }
        >
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              You'll be signed out and your profile will disappear. For the next{" "}
              <strong className="text-foreground">30 days</strong> you can undo this by simply
              signing in again — after that your name and email are erased for good.
            </p>
            <p className="text-sm text-muted-foreground">
              Quizzes you made stay published, and the scores of people who played them are
              kept — they just stop being linked to you.
            </p>
            <div className="space-y-1.5">
              <label htmlFor="confirm-username" className="text-sm">
                Type <strong className="text-foreground">{username}</strong> to confirm
              </label>
              <Input
                id="confirm-username"
                autoComplete="off"
                value={typedName}
                onChange={(e) => setTypedName(e.target.value)}
                placeholder={username}
              />
            </div>
          </div>
        </ConfirmationDialog>
      </div>
    </section>
  );
};
