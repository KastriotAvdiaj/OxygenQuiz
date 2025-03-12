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

export const quizColumns: ColumnDef<Quiz>[] = [
  {
    accessorKey: "title",
    header: "Title",
  },
  {
    accessorKey: "description",
    header: "Description",
  },
  {
    accessorKey: "timeLimit",
    header: "Time Limit",
  },
  {
    accessorKey: "passingScore",
    header: "Passing Score",
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
