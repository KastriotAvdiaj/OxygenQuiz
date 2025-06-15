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
import { Copy, Eye, MoreHorizontal } from "lucide-react";
import { DeleteQuiz } from "../delete-quiz";
import { Link } from "react-router-dom";
import { QuizSummaryDTO } from "@/types/ApiTypes";

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
    accessorKey: "isPublished",
    header: "Status",
    cell: ({ row }) => {
      const isPublished = row.original.isPublished;
      return (
        <div>
          {isPublished ? (
            <span className="bg-primary py-1 px-3 rounded-[5rem] text-background text-[12px]">
              Published
            </span>
          ) : (
            <span className="text-red-500">Private</span>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "numberOfQuestions",
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
            <DropdownMenuSeparator className="bg-background/60" />
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
              }}
            >
              <DeleteQuiz id={quiz.id} finished={close} />
            </DropdownMenuItem>
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
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
