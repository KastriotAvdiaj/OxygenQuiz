import { ColumnDef } from "@tanstack/react-table";
import { QuestionDifficulty } from "@/types/ApiTypes";
import { Button } from "@/components/ui";
import { Edit, Trash2 } from "lucide-react";
import { DeleteQuestionDifficulty } from "./delete-question-difficulty";

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
  {
    cell: ({ row }) => {
      const difficulty = row.original;
      console.log(difficulty);
      return (
        <div className="flex items-center justify-center space-x-2">
          <Button variant="outline">
            <Edit size={16} />
          </Button>
          <DeleteQuestionDifficulty id={difficulty.id} />
        </div>
      );
    },
    header: "Actions",
  },
];
