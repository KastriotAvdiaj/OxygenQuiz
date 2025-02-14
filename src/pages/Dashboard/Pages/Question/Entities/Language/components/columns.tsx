import { ColumnDef } from "@tanstack/react-table";
import { QuestionLanguage } from "@/types/ApiTypes";
import { Button } from "@/components/ui";
import { Edit } from "lucide-react";
// import { DeleteQuestionDifficulty } from "./delete-question-difficulty";
import formatDate from "@/lib/date-format";

export const langaugeColumns: ColumnDef<QuestionLanguage>[] = [
  {
    accessorKey: "id",
    header: "Id",
  },
  {
    accessorKey: "language",
    header: "Langauge",
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
    cell: () => {
      //   const difficulty = row.original;
      return (
        <div className="flex items-center space-x-2">
          <Button className="rounded-xl">
            <Edit size={16} />
          </Button>
          {/* <DeleteQuestionDifficulty id={difficulty.id} /> */}
        </div>
      );
    },
    header: "Actions",
  },
];
