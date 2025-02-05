import { ColumnDef } from "@tanstack/react-table";
import { QuestionDifficulty } from "@/types/ApiTypes";
import { Button } from "@/components/ui";
import { Edit } from "lucide-react";
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
      return (
        <div className="flex items-center space-x-2">
          <Button>
            <Edit size={16} />
          </Button>
          <DeleteQuestionDifficulty id={difficulty.id} />
        </div>
      );
    },
    header: "Actions",
  },
];
