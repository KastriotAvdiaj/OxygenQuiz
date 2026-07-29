import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AvatarUploader } from "@/pages/UserRelated/Profile/components/AvatarUploader";
import { useUser } from "@/lib/Auth";
import formatDate from "@/lib/date-format";

/**
 * Identity rows, Discord-style: label on the left, value and action on the right,
 * each row separated by a hairline.
 *
 * Sensitive values (email) are masked until revealed — the panel is often opened while
 * screen-sharing, and an address sitting in plain view is the kind of leak nobody
 * notices until it's happened.
 */
const IdentityRow = ({
  label,
  value,
  masked,
  action,
}: {
  label: string;
  value?: string | null;
  masked?: string;
  action?: React.ReactNode;
}) => {
  const [revealed, setRevealed] = useState(false);
  const canReveal = !!masked && !!value;

  return (
    // Stacks on phones: label above, value + action below, so a long email never
    // squeezes the action button off the edge at 360px.
    <div className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <div className="flex min-w-0 items-center gap-3">
        <span className="min-w-0 truncate text-sm">
          {canReveal && !revealed ? masked : (value ?? "—")}
        </span>
        {canReveal && (
          <button
            type="button"
            onClick={() => setRevealed((v) => !v)}
            className="shrink-0 text-sm font-medium text-primary hover:underline"
          >
            {revealed ? "Hide" : "Reveal"}
          </button>
        )}
        {action}
      </div>
    </div>
  );
};

/** name@example.com → *****@example.com (domain kept: enough to recognise your own). */
const maskEmail = (email?: string | null) => {
  if (!email) return undefined;
  const [name, domain] = email.split("@");
  if (!domain) return "•".repeat(email.length);
  return `${"•".repeat(Math.min(name.length, 10))}@${domain}`;
};

export const AccountPanel = () => {
  const { data: user } = useUser();
  const username = user?.username ?? "User";

  return (
    <div className="space-y-6">
      {/* Identity banner */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
          <AvatarUploader
            username={username}
            profileImageUrl={user?.profileImageUrl}
            initials={username[0]?.toUpperCase() ?? "U"}
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-semibold">{username}</p>
            <div className="mt-1.5 flex flex-wrap justify-center gap-1 sm:justify-start">
              {user?.roles?.length ? (
                user.roles.map((role) => (
                  <Badge key={role} variant="outline">
                    {role}
                  </Badge>
                ))
              ) : (
                <Badge variant="outline">Member</Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      <section className="rounded-xl border border-border bg-card px-4">
        <div className="divide-y divide-border/70">
          <IdentityRow
            label="Username"
            value={user?.username}
            action={
              <Button variant="outline" size="sm" disabled className="shrink-0">
                Edit
              </Button>
            }
          />
          <IdentityRow
            label="Email"
            value={user?.email}
            masked={maskEmail(user?.email)}
            action={
              <Button variant="outline" size="sm" disabled className="shrink-0">
                Edit
              </Button>
            }
          />
          <IdentityRow
            label="Member since"
            value={user?.dateRegistered ? formatDate(user.dateRegistered) : undefined}
          />
          <IdentityRow
            label="Last login"
            value={user?.lastLogin ? formatDate(user.lastLogin) : undefined}
          />
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card px-4">
        <div className="divide-y divide-border/70">
          <IdentityRow
            label="Password"
            value="Change your password"
            action={
              <Button variant="outline" size="sm" disabled className="shrink-0">
                Change
              </Button>
            }
          />
        </div>
      </section>
    </div>
  );
};
