import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useUser } from "@/lib/Auth";

/**
 * Identity block at the top of the account drawer: avatar + username, closed off by a
 * separator so the navigation below reads as its own group.
 *
 * The separator uses `bg-border` rather than the custom `Divider`, matching the rule
 * DashboardNav draws between sections — same token, same weight, so the two navigation
 * surfaces feel like one system.
 */
export const DrawerHeaderContent = () => {
  const { data: user } = useUser();

  const username = user?.username ?? "User";

  return (
    // pt-6 keeps the username clear of the drawer's absolutely-positioned close button.
    <div className="px-1 pt-6">
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10 shrink-0 ring-1 ring-border">
          <AvatarImage
            src={user?.profileImageUrl ?? undefined}
            alt={username}
          />
          {/* Initial only — the shared fallback supplies the muted circle behind it. */}
          <AvatarFallback>{username[0]?.toUpperCase() ?? "U"}</AvatarFallback>
        </Avatar>

        {/* min-w-0 lets the truncate actually engage inside the flex row. */}
        <p className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
          {username}
        </p>
      </div>

      <div className="mt-3 h-px bg-border mb-2" />
    </div>
  );
};
