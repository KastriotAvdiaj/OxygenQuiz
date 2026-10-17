import { useNotifications } from "@/common/Notifications";
import { buildShareUrl, useCreateShareLink } from "./create-share-link";

/**
 * Mint (or reuse) a quiz's share token and put the play URL on the clipboard, with the toast.
 *
 * One hook because two places offer it — the admin quiz page's ⋯ menu and the quiz table's row
 * menu, which is also the player's "My quizzes" (players have no single-quiz page;
 * known-issues.md). Only the owner can mint a token: the API answers 404 to anyone else
 * (`QuizService.GenerateShareTokenAsync`), so callers offer this on quizzes the viewer owns.
 */
export const useCopyShareLink = () => {
  const { addNotification } = useNotifications();
  const shareLink = useCreateShareLink();

  const copy = (quizId: number) =>
    shareLink.mutate(quizId, {
      onSuccess: async ({ shareToken }) => {
        const url = buildShareUrl(shareToken);
        try {
          await navigator.clipboard.writeText(url);
          addNotification({ type: "success", title: "Share link copied to clipboard" });
        } catch {
          // Clipboard can be blocked (e.g. insecure context) — still surface the link.
          addNotification({ type: "success", title: "Share link ready", message: url });
        }
      },
      onError: () => addNotification({ type: "error", title: "Couldn't create share link" }),
    });

  return { copy, isPending: shareLink.isPending };
};
