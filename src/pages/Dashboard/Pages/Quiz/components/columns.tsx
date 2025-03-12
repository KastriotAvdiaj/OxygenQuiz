import { ColumnDef } from "@tanstack/react-table";
import { Quiz } from "@/types/ApiTypes";
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

export const quizColumns: ColumnDef<Quiz>[] = [
  {
    id: "quizInfo",
    header: "Quiz Info",
    cell: ({ row }) => {
      const { title, description } = row.original;
      return (
        <TitleWithDescription
          title={title}
          description={description}
          wordLimit={20} // Adjust the limit as needed
        />
      );
    },
  },
  {
    accessorKey: "timeLimit",
    header: "Time Limit",
    cell: ({ row }) => {
      const timeLimit = row.original.timeLimit;
      return (
        <span>
          {timeLimit} {timeLimit === 1 ? "minute" : "minutes"}
        </span>
      );
    }
  },
  {
    accessorKey: "passingScore",
    header: "Passing Score",
    cell: ({ row }) => {
      const passingScore = row.original.passingScore;
      return <span>{passingScore}%</span>;
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
            <span className="bg-foreground py-1 px-3 rounded-[5rem] text-background text-[12px]">Published</span>
          ) : (
            <span className="text-red-500">Draft</span>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "numberOfQuestions",
    header: "Number of Questions",
  },
  //   {
  //     id: "actions",
  //     header: "Actions",
  //     cell: ({ row }) => {
  //       const user = row.original;
  //       const mainUser = useUser();

  //       const { open, isOpen, close } = useDisclosure();

  //       return (
  //         <DropdownMenu
  //           open={isOpen}
  //           onOpenChange={(state) => (state ? open() : close())}
  //         >
  //           <DropdownMenuTrigger asChild>
  //             <Button variant="default" className="h-8 w-8 p-0 rounded">
  //               <span className="sr-only">Open menu</span>
  //               <MoreHorizontal className="h-4 w-4" />
  //             </Button>
  //           </DropdownMenuTrigger>
  //           <DropdownMenuContent align="end" className="bg-muted">
  //             <DropdownMenuLabel>Actions</DropdownMenuLabel>
  //             <DropdownMenuItem
  //               onClick={() => navigator.clipboard.writeText(user.id)}
  //             >
  //               <Copy size={16} /> Copy ID
  //             </DropdownMenuItem>
  //             <DropdownMenuSeparator className="bg-background/60" />
  //             <DropdownMenuItem
  //               disabled={user.id === mainUser.data.id}
  //               onClick={(e) => {
  //                 e.stopPropagation();
  //                 e.preventDefault();
  //               }}
  //             ></DropdownMenuItem>
  //             <DropdownMenuSeparator className="bg-background/60" />
  //             <DropdownMenuItem>
  //               <UserRoundPen size={16} /> Edit User
  //             </DropdownMenuItem>
  //           </DropdownMenuContent>
  //         </DropdownMenu>
  //       );
  //     },
  //   },
];
