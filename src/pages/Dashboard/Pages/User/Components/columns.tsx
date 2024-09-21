import { ColumnDef } from "@tanstack/react-table";
import { User } from "@/types/ApiTypes";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserRoundPen } from "lucide-react";
import { UserX } from "lucide-react";
import { Copy } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  },
  {
    accessorKey: "role",
    header: "Role",
  },
  {
    accessorKey: "isDeleted",
    header: "Active",
  },
  {
    accessorKey: "lastLogin",
    header: "Last Login",
  },
  {
    accessorKey: "profileImageUrl",
    header: "Image Url",
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      const payment = row.original;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="default"
              className="h-8 w-8 p-0 rounded border border-border"
            >
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className=" bg-background-secondary">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => navigator.clipboard.writeText(payment.id)}
              className="hover:bg-background"
            >
              <Copy size={16} /> Copy ID
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-background" />
            <DropdownMenuItem className="hover:bg-background">
              <UserX size={16} /> Delete User
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-background" />
            <DropdownMenuItem className="hover:bg-background">
              <UserRoundPen size={16} /> Edit User
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
