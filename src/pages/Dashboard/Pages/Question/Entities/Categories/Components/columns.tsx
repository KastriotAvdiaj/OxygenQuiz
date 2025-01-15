import { ColumnDef } from "@tanstack/react-table";
import { QuestionCategory } from "@/types/ApiTypes";
import formatDate from "@/lib/date-format";

export const categoryColumns: ColumnDef<QuestionCategory>[] = [
  {
    accessorKey: "name",
    header: "Category",
  },
  {
    accessorKey: "id",
    header: "Id",
  },
  {
    accessorKey: "createdAt",
    header: "Created At",
    cell: ({ row }) => formatDate(row.original.createdAt),
  },
  {
    accessorKey: "username",
    header: "Created By",
  },
];
