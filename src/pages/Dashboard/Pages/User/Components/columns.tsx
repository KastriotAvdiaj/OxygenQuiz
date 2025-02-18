import { ColumnDef } from "@tanstack/react-table";
import { User } from "@/types/ApiTypes";
import { Button } from "@/components/ui/button";
import { useDisclosure } from "@/hooks/use-disclosure";
import {
  Copy,
  Activity,
  UserX,
  UserRoundPen,
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
    accessorKey: "role",
    header: "Role",
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
          }`}
        >
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

      const { open, isOpen, close } = useDisclosure();

      return (
        <DropdownMenu
          open={isOpen}
          onOpenChange={(state) => (state ? open() : close())}
        >
          <DropdownMenuTrigger asChild>
            <Button variant="default" className="h-8 w-8 p-0 rounded">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-muted">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => navigator.clipboard.writeText(user.id)}
            >
              <Copy size={16} /> Copy ID
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-background/60" />
            <DropdownMenuItem
              disabled={user.id === mainUser.data.id}
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
              }}
            >
              <DeleteUser id={user.id} closeDropDown={close} />
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-background/60" />
            <DropdownMenuItem>
              <UserRoundPen size={16} /> Edit User
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
