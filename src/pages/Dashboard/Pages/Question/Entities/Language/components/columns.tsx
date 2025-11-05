import { ColumnDef } from "@tanstack/react-table";
import { Edit } from "lucide-react";
import formatDate from "@/lib/date-format";
import { DeleteQuestionLanguage } from "./delete-question-language";
import { Authorization, ROLES } from "@/lib/authorization";
import { LiftedButton } from "@/common/LiftedButton";
import { QuestionLanguage } from "@/types/question-types";

export const langaugeColumns: ColumnDef<QuestionLanguage>[] = [
  {
    accessorKey: "id",
    header: "Id",
  },
  {
    accessorKey: "language",
    header: "Language",
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
          <Authorization allowedRoles={[ROLES.SuperAdmin]}>
            <LiftedButton variant="icon">
              <Edit size={16} />
            </LiftedButton>
            <DeleteQuestionLanguage id={language.id} />
          </Authorization>
        </div>
      );
    },
    header: "Actions",
  },
];
