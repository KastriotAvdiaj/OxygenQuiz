import { ColumnDef } from "@tanstack/react-table";
import { QuestionLanguage } from "@/types/ApiTypes";
import { Button } from "@/components/ui";
import { Edit } from "lucide-react";
import formatDate from "@/lib/date-format";
import { DeleteQuestionLanguage } from "./delete-question-language";

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
    cell: ({ row }) => {
      const language = row.original;
      return (
        <div className="flex items-center space-x-2">
          <Button className="rounded-xl">
            <Edit size={16} />
          </Button>
          <DeleteQuestionLanguage id={language.id} />
        </div>
      );
    },
    header: "Actions",
  },
];
