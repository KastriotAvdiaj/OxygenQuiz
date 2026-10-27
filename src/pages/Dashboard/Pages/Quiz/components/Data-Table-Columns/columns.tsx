import { EditPencil } from "@/components/icons/edit-pencil";
import { PlayTriangle } from "@/components/icons/play-triangle";
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
import { dashboardBaseOf, quizViewPath, useQuizEditPath } from "../../quiz-paths";
import { useDisclosure } from "@/hooks/use-disclosure";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui";
import { MoreHorizontal } from "lucide-react";
import {
  CopySheets,
  HiddenEye,
  PickSparkle,
  PublishArrow,
  TrashBin,
  ViewEye,
} from "@/components/icons/solid-icons";
import { useModerationAction } from "@/features/reports/api/reports";
import { DeleteQuiz } from "../delete-quiz";
import { Link, useLocation } from "react-router-dom";
import { useUser } from "@/lib/Auth";
import { quizPlayPath } from "@/pages/Quiz/quiz-play-path";
import { useCopyQuizLink } from "../../api/use-copy-quiz-link";
import { useSetQuizStatus } from "../../api/set-quiz-status";
import { useNotifications } from "@/common/Notifications";
import { QuizSummaryDTO } from "@/types/quiz-types";

/**
 * Nine columns, which no phone and no tablet can hold at once. `meta.priority` decides the
 * order they leave in as the table's container narrows — `DataTable` hides the ones that
 * don't fit and puts their values in the row's detail panel. See
 * docs/adr/0010-a-narrow-table-drops-columns-it-does-not-scroll.md.
 *
 * The tiers, and the reasoning for this table:
 *
 * - **1 — Quiz Info, Status, Actions.** Which quiz it is, whether it is live, and what you
 *   can do about it. A list stripped to these three still answers the question an admin
 *   opens this page with; strip one more and it doesn't.
 * - **2 — Date Created, Author.** The two you scan to find a specific quiz among similar
 *   titles. Worth a column as soon as there is room for one.
 * - **3 — Category, Difficulty, Language, Questions.** Attributes of a quiz you have
 *   already found. They are also all filterable from the panel beside this table, which is
 *   the better tool for "show me the hard Albanian ones" anyway.
 */
export const quizColumns: ColumnDef<QuizSummaryDTO>[] = [
  {
    id: "quizInfo",
    header: "Quiz Info",
    meta: { priority: 1 },
    cell: ({ row, table }) => {
      const { title, description } = row.original;
      // Compact tables (My Quizzes) show the title and one clamped line of description —
      // the "Read more" toggle is what made every row two to four lines tall.
      if (table.options.meta?.density === "compact") {
        return (
          <div className="flex min-w-0 max-w-md flex-col">
            <span className="truncate font-semibold text-foreground">{title}</span>
            {description && (
              <span
                className="truncate text-xs text-muted-foreground"
                title={description}
              >
                {description}
              </span>
            )}
          </div>
        );
      }
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
    meta: { priority: 2 },
    cell: ({ row }) => {
      const date = row.original.createdAt;
      return <span className="whitespace-nowrap">{formatDate(date)}</span>;
    },
  },
  {
    accessorKey: "user",
    header: "Author",
    meta: { priority: 2 },
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
    meta: { priority: 3 },
  },
  {
    accessorKey: "difficulty",
    header: "Difficulty",
    meta: { priority: 3 },
  },
  {
    accessorKey: "language",
    header: "Language",
    meta: { priority: 3 },
  },
  {
    accessorKey: "status",
    header: "Status",
    meta: { priority: 1 },
    cell: ({ row }) => {
      const { status, deletedAt, moderationHeld } = row.original;
      if (moderationHeld && !deletedAt) {
        // Held by a moderator (docs/media/moderation.md): whatever the status, nobody else sees it.
        return (
          <span className="inline-flex items-center rounded-full border border-amber-500/40 bg-amber-500/15 px-2.5 py-0.5 text-xs font-medium text-foreground">
            Under review
          </span>
        );
      }
      if (deletedAt) {
        return (
          <span className="inline-flex items-center rounded-full border border-destructive/30 bg-destructive/15 px-2.5 py-0.5 text-xs font-medium text-destructive">
            Deleted
          </span>
        );
      }
      if (status === "Public") {
        return (
          <span className="inline-flex items-center rounded-full bg-primary px-2.5 py-0.5 text-xs font-medium text-white">
            Public
          </span>
        );
      }
      if (status === "Unlisted") {
        return (
          <span className="inline-flex items-center rounded-full border border-foreground/30 bg-amber-400/80 px-2.5 py-0.5 text-xs font-medium text-foreground">
            Unlisted
          </span>
        );
      }
      return (
        <span className="inline-flex items-center rounded-full border border-foreground/30 bg-gray-300 px-2.5 py-0.5 text-xs font-medium dark:bg-gray-500">
          Draft
        </span>
      );
    },
  },
  {
    accessorKey: "questionCount",
    header: "Questions",
    meta: { priority: 3 },
    // A board has no questions; "0" would read as an empty quiz (docs/quiz/associations.md §1).
    cell: ({ row }) =>
      row.original.format === "Associations" ? (
        <span className="text-muted-foreground">Board</span>
      ) : (
        row.original.questionCount
      ),
  },
  {
    id: "actions",
    header: "Actions",
    meta: { priority: 1 },
    // A component, not an inline cell body: the actions need hooks (menu and dialog state, the
    // edit path), and hooks inside a plain render function break the rules of hooks.
    cell: ({ row }) => <QuizActionsCell quiz={row.original} />,
  },
];

/** The ⋯ menu for one quiz row. Shared by the admin table and "My quizzes". */
function QuizActionsCell({ quiz }: { quiz: QuizSummaryDTO }) {
  const { open, isOpen, close } = useDisclosure();
  // The table is shared by both dashboards; edit within whichever one it's shown in.
  const editPath = useQuizEditPath();
  // Both dashboards have the single-quiz page now (`quizViewPath`); "View" opens it in whichever
  // this table is shown in, and so does a click on the row (`onRowClick` where the table is used).
  const base = dashboardBaseOf(useLocation().pathname);
  const isAdminDashboard = base === "/dashboard";
  // "My quizzes" lists only the viewer's own (`scope: "mine"`); the admin table lists everyone's,
  // and a summary row carries the author's username, not an id.
  const { data: currentUser } = useUser();
  const isOwn = !isAdminDashboard || quiz.user === currentUser?.username;
  // Play mirrors `QuizPlayAccess.IsPlayAuthorized` (Public, or yours). Copy link: a Public quiz's
  // listing URL is public, so anyone may copy it; an Unlisted quiz's share link mirrors
  // `GenerateShareTokenAsync` (yours); a Draft has no link (docs/quiz/quiz-listing.md).
  const canPlay = !quiz.deletedAt && ((quiz.status === "Public" && !quiz.moderationHeld) || isOwn);
  const canShare =
    !quiz.deletedAt && !quiz.moderationHeld && (quiz.status === "Public" || (isOwn && quiz.status === "Unlisted"));
  const shareLink = useCopyQuizLink();
  // Publish / Unpublish from the row, without opening the quiz first. Same target rule as the
  // quiz page's menu (Quiz.tsx `handleSetStatus`): a Draft goes Public, anything else back to
  // Draft. The API lets the owner, or anyone with quiz:update:any (Admin, SuperAdmin), do it —
  // and both dashboards only list quizzes the viewer is one of those for. A refused Publish (an
  // "Unspecified" category / language / difficulty) is already toasted with the API's own
  // message by the axios interceptor.
  const { addNotification } = useNotifications();
  const setStatus = useSetQuizStatus();
  const isDraft = quiz.status === "Draft";
  const handleToggleStatus = () =>
    setStatus.mutate(
      { quizId: quiz.id, status: isDraft ? "Public" : "Draft" },
      {
        onSuccess: () =>
          addNotification({
            type: "success",
            title: isDraft ? "Quiz published" : "Quiz moved back to draft",
          }),
      },
    );
  // Pick / unpick from the admin table, so curating the catalogue doesn't mean opening every quiz.
  // Mirrors `canPick` on the quiz page and `quiz:pick` on POST /api/moderation/quizzes/{id}/pick
  // (Public, not held). Admin dashboard only: "My quizzes" is the author's view, not a moderator's.
  const pickAction = useModerationAction();
  const canPick =
    isAdminDashboard &&
    !quiz.deletedAt &&
    !!currentUser &&
    (currentUser.roles?.includes("SuperAdmin") || currentUser.permissions?.includes("quiz:pick")) &&
    quiz.status === "Public" &&
    !quiz.moderationHeld;
  const togglePick = () =>
    pickAction.mutate(
      { kind: quiz.isPicked ? "unpick" : "pick", quizId: quiz.id },
      {
        onSuccess: () =>
          addNotification({ type: "success", title: quiz.isPicked ? "Removed from picked" : "Picked for the catalogue" }),
      },
    );
  // Separate disclosure for the delete confirmation. It's rendered OUTSIDE the
  // dropdown (below) so closing the menu can't unmount an open dialog and leave
  // `pointer-events: none` stuck on <body>.
  const deleteDialog = useDisclosure();

  return (
    <>
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
        {/* Order: the things you do with the quiz, then admin tooling, then Delete last in red —
            the quiz page's own ⋯ menu (QuizActionsMenu) reads the same way. No separators: they
            fell between some items and not others and read as accidental (2026-10-20). */}
        <DropdownMenuItem className="hover:bg-background" asChild>
          <Link to={quizViewPath(quiz, base)} className="flex items-center gap-2">
            <ViewEye size={16} /> View
          </Link>
        </DropdownMenuItem>
        {canPlay && (
          <DropdownMenuItem className="hover:bg-background" asChild>
            <Link to={quizPlayPath(quiz)} className="flex items-center gap-2">
              <PlayTriangle size={16} /> Play
            </Link>
          </DropdownMenuItem>
        )}
        {canShare && (
          <DropdownMenuItem
            className="hover:bg-background"
            disabled={shareLink.isPending}
            onClick={() => shareLink.copy(quiz)}
          >
            <CopySheets size={16} />
            {quiz.status === "Unlisted" ? "Copy share link" : "Copy link"}
          </DropdownMenuItem>
        )}
        {!quiz.deletedAt && (
          <DropdownMenuItem className="hover:bg-background" asChild>
            <Link to={editPath(quiz)} className="flex items-center gap-2">
              <EditPencil size={16} /> Edit
            </Link>
          </DropdownMenuItem>
        )}
        {!quiz.deletedAt && (
          <DropdownMenuItem
            className="hover:bg-background"
            disabled={setStatus.isPending}
            onClick={handleToggleStatus}
          >
            {isDraft ? <PublishArrow size={16} /> : <HiddenEye size={16} />}
            {isDraft ? "Publish" : "Unpublish"}
          </DropdownMenuItem>
        )}
        {canPick && (
          <DropdownMenuItem className="hover:bg-background" disabled={pickAction.isPending} onClick={togglePick}>
            <PickSparkle size={16} />
            {quiz.isPicked ? "Remove from picked" : "Pick for the catalogue"}
          </DropdownMenuItem>
        )}
        {/* Admin tooling only. A player never needs a quiz's database id — nothing in the
            player's app takes one. */}
        {isAdminDashboard && (
          <DropdownMenuItem
            className="hover:bg-background"
            onClick={() => navigator.clipboard.writeText(String(quiz.id))}
          >
            {/* The same icon as Copy link: both copy something, and the label says what. */}
            <CopySheets size={16} /> Copy ID
          </DropdownMenuItem>
        )}
        {!quiz.deletedAt && (
          <>
            <DropdownMenuItem
              className="text-red-600 focus:text-red-600"
              onSelect={() => {
                // Let the menu finish closing, then open the dialog on the next
                // frame so the two Radix modal layers never overlap.
                requestAnimationFrame(() => deleteDialog.open());
              }}
            >
              <TrashBin size={16} /> Delete
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>

    {/* Rendered outside the dropdown on purpose — see note above. */}
    <DeleteQuiz
      id={quiz.id}
      open={deleteDialog.isOpen}
      onOpenChange={(state) =>
        state ? deleteDialog.open() : deleteDialog.close()
      }
      finished={deleteDialog.close}
    />
    </>
  );
}
