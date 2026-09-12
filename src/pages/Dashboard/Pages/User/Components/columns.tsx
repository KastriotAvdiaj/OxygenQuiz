import { ColumnDef } from "@tanstack/react-table";
import { User } from "@/types/user-types";
import { Button } from "@/components/ui/button";
import { useDisclosure } from "@/hooks/use-disclosure";
import {
  Copy,
  Activity,
  UserX,
  UserRoundCog,
  MoreHorizontal,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DeleteUser } from "./delete-user";
import { ChangeUserRole } from "./change-user-role";
import formatDate from "@/lib/date-format";
import { useUser } from "@/lib/Auth";

/**
 * Eight columns, which no phone and no tablet can hold at once. `meta.priority` decides the
 * order they leave in as the table's container narrows — `DataTable` hides the ones that
 * don't fit and puts their values in the row's detail panel. See
 * docs/adr/0010-a-narrow-table-drops-columns-it-does-not-scroll.md.
 *
 * The tiers, and the reasoning for this table:
 *
 * - **1 — Username, Status, Actions.** Who the account belongs to, whether it is still
 *   active, and what you can do about it. A list stripped to these three still answers the
 *   question an admin opens this page with; strip one more and it doesn't.
 * - **2 — Email, Roles.** The two you scan to tell similar usernames apart and to see who
 *   holds elevated access. Worth a column as soon as there is room for one.
 * - **3 — Date Registered, Last Login, Image Url.** Attributes of an account you have
 *   already found. The two dates are also both filterable from the panel beside this table,
 *   which is the better tool for "who signed up last week" anyway; the image URL is a raw
 *   string nobody reads across a row.
 */
export const columns: ColumnDef<User>[] = [
  {
    accessorKey: "username",
    header: "Username",
    meta: { priority: 1 },
  },
  {
    accessorKey: "email",
    header: "Email",
    meta: { priority: 2 },
  },
  {
    accessorKey: "roles",
    header: "Roles",
    meta: { priority: 2 },
    cell: ({ row }) => {
      const roles = row.original.roles ?? [];
      return roles.length ? roles.join(", ") : "—";
    },
  },
  {
    accessorKey: "dateRegistered",
    header: "Date Registered",
    meta: { priority: 3 },
    cell: ({ row }) => {
      const date = row.original.dateRegistered;
      return formatDate(date);
    },
  },
  {
    accessorKey: "isDeleted",
    header: "Status",
    meta: { priority: 1 },
    cell: ({ row }) => {
      const isDeleted = row.original.isDeleted;

      return (
        <div
          className={`flex items-center justify-center p-1 rounded-[2rem] text-[12px] font-semibold  ${
            isDeleted ? "bg-red-100 text-red-700" : "bg-primary text-white"
          }`}>
          {isDeleted ? (
            <>
              <UserX className="w-3 h-3 mr-2" /> deleted
            </>
          ) : (
            <>
              <Activity className="w-3 h-3 mr-2" /> active
            </>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "lastLogin",
    header: "Last Login",
    meta: { priority: 3 },
    cell: ({ row }) => {
      const date = row.original.lastLogin;
      return formatDate(date);
    },
  },
  {
    accessorKey: "profileImageUrl",
    header: "Image Url",
    meta: { priority: 3 },
  },
  {
    id: "actions",
    header: "Actions",
    meta: { priority: 1 },
    cell: ({ row }) => {
      const user = row.original;

      const mainUser = useUser();
      if (!mainUser?.data) return null;

      const { open, isOpen, close } = useDisclosure();
      // Separate disclosure so the role dialog can live OUTSIDE the dropdown —
      // otherwise the still-open menu steals pointer/focus and collapses the
      // roles popover the moment you move the mouse.
      const roleDialog = useDisclosure();

      // Role-management gating (backend enforces the same rules):
      //  - never let someone change their own role (self-demotion / lockout footgun)
      //  - an Admin can't manage a SuperAdmin; only a SuperAdmin can.
      const isSelf = user.id === mainUser.data.id;
      const callerIsSuperAdmin =
        mainUser.data.roles?.includes("SuperAdmin") ?? false;
      const targetIsSuperAdmin = (user.roles ?? []).some(
        (r) => r.toLowerCase() === "superadmin"
      );
      const canManageRoles =
        !isSelf && (callerIsSuperAdmin || !targetIsSuperAdmin);
      const disabledReason = isSelf
        ? "You can't change your own role"
        : "Only a SuperAdmin can change a SuperAdmin's role";

      return (
        <>
        <DropdownMenu
          open={isOpen}
          onOpenChange={(state) => (state ? open() : close())}>
          <DropdownMenuTrigger asChild>
            <Button variant="default" className="h-8 w-8 p-0 rounded">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-muted">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => navigator.clipboard.writeText(user.id)}>
              <Copy size={16} /> Copy ID
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-background/60" />
            <DropdownMenuItem
              disabled={user.id === mainUser.data.id}
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
              }}>
              <DeleteUser id={user.id} closeDropDown={close} />
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-background/60" />
            {canManageRoles ? (
              <DropdownMenuItem
                onSelect={() =>
                  // Let the menu close first, then open the dialog next frame.
                  requestAnimationFrame(() => roleDialog.open())
                }>
                <UserRoundCog size={16} /> Change Role
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem disabled title={disabledReason}>
                <UserRoundCog size={16} /> Change Role
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Rendered outside the dropdown on purpose — see note above. */}
        {canManageRoles && (
          <ChangeUserRole
            user={{
              id: user.id,
              username: user.username,
              roles: user.roles ?? [],
            }}
            open={roleDialog.isOpen}
            onOpenChange={(state) =>
              state ? roleDialog.open() : roleDialog.close()
            }
            closeDropDown={roleDialog.close}
          />
        )}
        </>
      );
    },
  },
];
