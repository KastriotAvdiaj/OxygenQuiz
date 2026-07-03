import { ColumnDef } from "@tanstack/react-table";
// import { Button } from "@/components/ui/button";
// import { useDisclosure } from "@/hooks/use-disclosure";
// import {
//   Copy,
//   Activity,
//   UserX,
//   UserRoundPen,
//   MoreHorizontal,
// } from "lucide-react";
// import {
//   DropdownMenu,
//   DropdownMenuContent,
//   DropdownMenuItem,
//   DropdownMenuLabel,
//   DropdownMenuSeparator,
//   DropdownMenuTrigger,
// } from "@/components/ui/dropdown-menu";
import formatDate from "@/lib/date-format";
import TitleWithDescription from "./title-description";
import { useDisclosure } from "@/hooks/use-disclosure";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui";
import { Copy, Edit2, Eye, MoreHorizontal } from "lucide-react";
import { DeleteQuiz } from "../delete-quiz";
import { Link } from "react-router-dom";
import { QuizSummaryDTO } from "@/types/quiz-types";

export const quizColumns: ColumnDef<QuizSummaryDTO>[] = [
  {
    id: "quizInfo",
    header: "Quiz Info",
    cell: ({ row }) => {
      const { title, description } = row.original;
      return (
        <TitleWithDescription
          title={title}
          description={description ? description : ""}
          wordLimit={20} // Adjust the limit as needed
        />
      );
    },
  },
  {
    accessorKey: "createdAt",
    header: "Date Created",
    cell: ({ row }) => {
      const date = row.original.createdAt;
      return formatDate(date);
    },
  },
  {
    accessorKey: "user",
    header: "Author",
    cell: ({ row }) => {
      const user = row.original.user;
      return (
        <div className="flex items-center gap-2">
          <span className="font-medium">{user}</span>
        </div>
      );
    },
  },
  {
    accessorKey: "category",
    header: "Category",
  },
  {
    accessorKey: "difficulty",
    header: "Difficulty",
  },
  {
    accessorKey: "language",
    header: "Language",
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const { status, deletedAt } = row.original;
      if (deletedAt) {
        return (
          <span className="bg-destructive/15 text-destructive border border-destructive/30 py-1 px-3 rounded-full">
            Deleted
          </span>
        );
      }
      if (status === "Public") {
        return (
          <span className="bg-primary py-1 px-3 rounded-full text-white">
            Public
          </span>
        );
      }
      if (status === "Unlisted") {
        return (
          <span className="bg-amber-400/80 border border-foreground/30 text-foreground py-1 px-3 rounded-full">
            Unlisted
          </span>
        );
      }
      return (
        <span className="bg-gray-300 border border-foreground/30 dark:bg-gray-500 p-1 px-3 rounded-full">
          Draft
        </span>
      );
    },
  },
  {
    accessorKey: "questionCount",
    header: "Questions",
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      const quiz = row.original;

      const { open, isOpen, close } = useDisclosure();

      return (
        <DropdownMenu
          open={isOpen}
          onOpenChange={(state) => (state ? open() : close())}
        >
          <DropdownMenuTrigger asChild>
            <Button variant="default" className="h-8 w-8 p-0 rounded">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-muted">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() =>
                navigator.clipboard.writeText(quiz.id as unknown as string)
              }
            >
              <Copy size={16} /> Copy ID
            </DropdownMenuItem>
            {!quiz.deletedAt && (
              <>
                <DropdownMenuSeparator className="bg-background/60" />
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                  }}
                >
                  <DeleteQuiz id={quiz.id} finished={close} />
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuSeparator className="bg-background/60" />
            <DropdownMenuItem className="hover:bg-background">
              <Link
                to={`/dashboard/quiz/${quiz.id}`}
                className="w-full h-full flex items-center gap-2"
              >
                <Eye size={16} />
                View
              </Link>
            </DropdownMenuItem>
            {!quiz.deletedAt && (
              <DropdownMenuItem className="hover:bg-background">
                <Link
                  to={`/dashboard/quizzes/edit-quiz/${quiz.id}`}
                  className="w-full h-full flex items-center gap-2"
                >
                  <Edit2 size={16} />
                  Edit
                </Link>
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
