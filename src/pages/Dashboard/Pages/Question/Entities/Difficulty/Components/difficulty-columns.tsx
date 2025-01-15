import { ColumnDef } from "@tanstack/react-table";
import { QuestionDifficulty } from "@/types/ApiTypes";

export const difficultyColumns: ColumnDef<QuestionDifficulty>[] = [
  {
    accessorKey: "id",
    header: "Id",
  },
  {
    accessorKey: "level",
    header: "Difficulty",
  },
  {
    accessorKey: "weight",
    header: "Weight",
  },
];
