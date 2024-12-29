import { ColumnDef } from "@tanstack/react-table";
import { QuestionCategory } from "@/types/ApiTypes";

export const columns: ColumnDef<QuestionCategory>[] = [
  {
    accessorKey: "name",
    header: "Category",
  },
  {
    accessorKey: "id",
    header: "Id",
  },
];
