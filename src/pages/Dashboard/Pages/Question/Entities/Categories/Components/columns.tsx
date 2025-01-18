import { ColumnDef } from "@tanstack/react-table";
import { QuestionCategory } from "@/types/ApiTypes";
import formatDate from "@/lib/date-format";
import { Button } from "@/components/ui";
import { Edit } from "lucide-react";
import { DeleteQuestionCategory } from "./delete-question-category";

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
  {
    cell: ({ row }) => {
      const category = row.original;
      return (
        <div className="flex items-center space-x-2">
          <Button>
            <Edit size={16} />
          </Button>
          <DeleteQuestionCategory id={category.id} />
        </div>
      );
    },
    header: "Actions",
  },
];
