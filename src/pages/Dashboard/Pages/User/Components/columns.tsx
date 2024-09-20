import { ColumnDef } from "@tanstack/react-table";
import { User } from "@/types/ApiTypes";

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
];
