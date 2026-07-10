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

export const columns: ColumnDef<User>[] = [
  {
    accessorKey: "username",
    header: "Username",
  },
  {
    accessorKey: "email",
    header: "Email",
  },
  {
    accessorKey: "roles",
    header: "Roles",
    cell: ({ row }) => {
      const roles = row.original.roles ?? [];
      return roles.length ? roles.join(", ") : "—";
    },
  },
  {
    accessorKey: "dateRegistered",
    header: "Date Registered",
    cell: ({ row }) => {
      const date = row.original.dateRegistered;
      return formatDate(date);
    },
  },
  {
    accessorKey: "isDeleted",
    header: "Status",
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
    cell: ({ row }) => {
      const date = row.original.lastLogin;
      return formatDate(date);
    },
  },
  {
    accessorKey: "profileImageUrl",
    header: "Image Url",
  },
  {
    id: "actions",
    header: "Actions",
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
