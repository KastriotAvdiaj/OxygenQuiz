import { ColumnDef } from "@tanstack/react-table";
import { Edit } from "lucide-react";
import { DeleteQuestionDifficulty } from "./delete-question-difficulty";
import formatDate from "@/lib/date-format";
import { Authorization, ROLES } from "@/lib/authorization";
import { LiftedButton } from "@/common/LiftedButton";
import { QuestionDifficulty } from "@/types/question-types";

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
    accessorKey: "createdAt",
    header: "Created At",
    cell: ({ row }) => formatDate(row.original.createdAt),
  },
  {
    accessorKey: "username",
    header: "Created By",
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
          <Authorization allowedRoles={[ROLES.SuperAdmin]}>
            <LiftedButton variant="icon">
              <Edit size={16} />
            </LiftedButton>
            <DeleteQuestionDifficulty id={difficulty.id} />
          </Authorization>
        </div>
      );
    },
    header: "Actions",
  },
];
