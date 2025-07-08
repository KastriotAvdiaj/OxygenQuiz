import { ColumnDef } from "@tanstack/react-table";
import formatDate from "@/lib/date-format";
import { Edit } from "lucide-react";
import { DeleteQuestionCategory } from "./delete-question-category";
import { Authorization } from "@/lib/authorization";
import { LiftedButton } from "@/common/LiftedButton";
import { QuestionCategory } from "@/types/question-types";
import UpdateQuestionCategoryForm from "./update-question-category";

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
          <Authorization allowedRoles={["SuperAdmin"]}>
            <UpdateQuestionCategoryForm
              triggerButton={
                <LiftedButton variant="icon">
                  <Edit size={16} />
                </LiftedButton>
              }
              category={row.original}
            />

            <DeleteQuestionCategory id={category.id} />
          </Authorization>
        </div>
      );
    },
    header: "Actions",
  },
];
