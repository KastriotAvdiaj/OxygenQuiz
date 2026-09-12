import { Edit2, Eye, EyeOff, MoreHorizontal, Share2, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Quiz } from "@/types/quiz-types";

export interface QuizActionsMenuProps {
  quiz: Quiz;
  isDraft: boolean;
  onShare: () => void;
  isSharePending: boolean;
  onSetStatus: () => void;
  isStatusPending: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

/**
 * Every action on the quiz page, in one menu.
 *
 * <b>This replaces a four-control toolbar</b> — Share, Publish/Unpublish and Edit Quiz as
 * separate buttons, plus a ⋯ menu for Delete and the phone-sized copies of the other three.
 * Four controls in a full-width strip above the page's own heading, and the same actions
 * written twice so the narrow layout could reach them.
 *
 * The quiz **rows** in the data table already solved this: one 32px ⋯ button, a labelled menu,
 * destructive item in red at the bottom. Matching it means someone who has used the list knows
 * this page without learning a second pattern — and the duplication disappears, because a menu
 * is the same menu at every width.
 *
 * The trigger deliberately copies the row's `h-8 w-8 p-0 rounded` rather than `size="icon"`,
 * which is 36px and would sit a row taller than everything it lines up with.
 *
 * <b>Not a `Tooltip` on the Publish item.</b> The button it replaced carried one explaining
 * what Unpublish costs; a menu item can say it in the item, and a tooltip inside an open
 * Radix menu fights the menu for the same hover.
 */
export const QuizActionsMenu = ({
  quiz,
  isDraft,
  onShare,
  isSharePending,
  onSetStatus,
  isStatusPending,
  onEdit,
  onDelete,
}: QuizActionsMenuProps) => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button
        variant="default"
        className="h-8 w-8 shrink-0 rounded p-0"
        aria-label="Quiz actions"
      >
        <span className="sr-only">Open menu</span>
        <MoreHorizontal className="h-4 w-4" />
      </Button>
    </DropdownMenuTrigger>

    <DropdownMenuContent align="end" className="w-56 bg-muted">
      <DropdownMenuLabel>Actions</DropdownMenuLabel>

      <DropdownMenuItem className="hover:bg-background" onClick={onEdit}>
        <Edit2 size={16} /> Edit quiz
      </DropdownMenuItem>

      {/* Not offered on a Draft: the backend mints a token its own resolver 404s, so sharing
          one could only produce a link that fails at the recipient's end. */}
      {!isDraft && (
        <DropdownMenuItem
          className="hover:bg-background"
          disabled={isSharePending}
          onClick={onShare}
        >
          <Share2 size={16} />
          {quiz.status === "Unlisted" ? "Copy share link" : "Share"}
        </DropdownMenuItem>
      )}

      <DropdownMenuSeparator className="bg-background/60" />

      {/* The label carries what the old tooltip did — "Unpublish" alone doesn't say what it
          costs, and there is room here to say it. */}
      <DropdownMenuItem
        className="hover:bg-background"
        disabled={isStatusPending}
        onClick={onSetStatus}
      >
        {isDraft ? <Eye size={16} /> : <EyeOff size={16} />}
        <span className="flex flex-col">
          <span>{isDraft ? "Publish" : "Unpublish"}</span>
          <span className="text-xs text-muted-foreground">
            {isDraft ? "Anyone can find and play it" : "Back to draft — only you see it"}
          </span>
        </span>
      </DropdownMenuItem>

      <DropdownMenuSeparator className="bg-background/60" />

      {/* `onSelect` + a frame's delay, not `onClick`: the confirm dialog is owned by the page
          and rendered outside this menu, and opening it while Radix is still closing the menu
          leaves two modal layers overlapping and `pointer-events: none` stuck on <body>. The
          data-table row does the same thing for the same reason. */}
      <DropdownMenuItem
        className="text-red-600 focus:text-red-600"
        onSelect={() => requestAnimationFrame(onDelete)}
      >
        <Trash2 size={16} /> Delete quiz
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
);
