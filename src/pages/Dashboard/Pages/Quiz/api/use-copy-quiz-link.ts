import { useNotifications } from "@/common/Notifications";
import { listingUrl } from "@/lib/quiz-listing-url";
import { buildShareUrl, useCreateShareLink } from "./create-share-link";

/** What Copy link needs to know about a quiz to pick its link. */
export type CopyableQuiz = { id: number; title: string; status: string };

/**
 * Put a quiz's link on the clipboard, with the toast. Which link depends on its status
 * (docs/quiz/quiz-listing.md, "Copy link"):
 *
 * - **Public** → its listing, `https://oxygenquiz.com/q/:id/:slug` — the indexable page, built here
 *   with the same function the Worker uses. No API call.
 * - **Unlisted** → its share link, minting (or reusing) the token. Only the owner can mint one: the
 *   API answers 404 to anyone else (`QuizService.GenerateShareTokenAsync`), so callers offer it on
 *   quizzes the viewer owns. A Draft has neither link.
 *
 * Offered from the quiz row's ⋯ menu (both dashboards), the single-quiz page's ⋯ menu and, for a
 * Public quiz, the catalogue's start modal.
 */
export const useCopyQuizLink = () => {
  const { addNotification } = useNotifications();
  const shareLink = useCreateShareLink();

  const toClipboard = async (url: string, copied: string) => {
    try {
      await navigator.clipboard.writeText(url);
      addNotification({ type: "success", title: copied });
    } catch {
      // Clipboard can be blocked (e.g. insecure context) — still surface the link.
      addNotification({ type: "success", title: "Link ready", message: url });
    }
  };

  const copy = (quiz: CopyableQuiz) => {
    if (quiz.status === "Public") {
      void toClipboard(listingUrl(quiz.id, quiz.title), "Link copied to clipboard");
      return;
    }
    shareLink.mutate(quiz.id, {
      onSuccess: ({ shareToken }) => void toClipboard(buildShareUrl(shareToken), "Share link copied to clipboard"),
      onError: () => addNotification({ type: "error", title: "Couldn't create share link" }),
    });
  };

  return { copy, isPending: shareLink.isPending };
};
