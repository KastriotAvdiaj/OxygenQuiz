import { useEffect, useCallback } from "react";
import { useBlocker } from "react-router-dom";

interface UseNavigationGuardReturn {
  showLeaveDialog: boolean;
  confirmNavigation: () => void;
  cancelNavigation: () => void;
}

/**
 * Prevents accidental navigation away from the current page.
 *
 * <b>Shared, not multiplayer's.</b> It lived in `pages/Quiz/Multiplayer/hooks/` while the
 * lobby was its only caller. The AI quiz wizard is the second — an in-flight generation is
 * lost the same way a lobby seat is — and the rule it encodes (block the router *and* the
 * unload) is not specific to either feature, so it moved here rather than being copied.
 *
 * Uses two complementary mechanisms:
 * 1. `useBlocker` (react-router-dom) — intercepts in-app route changes
 *    (browser back / forward, programmatic navigate, link clicks).
 * 2. `beforeunload` event — catches hard navigations like tab close,
 *    browser refresh, or typing a new URL. The browser shows its native
 *    "Leave site?" dialog for these cases.
 *
 * <b>A blocked navigation must always have a visible way out.</b> Whenever `shouldBlock` can
 * be true, the caller has to render something driven by `showLeaveDialog` in *every* branch it
 * can render in that state. Arming the blocker on a branch whose dialog lives in another
 * branch leaves it stuck in "blocked" with no proceed and no reset, and every further click
 * builds a fresh blocker and re-renders the subtree — the bug that once froze the multiplayer
 * question timer (see MultiplayerLobbyPage).
 *
 * @param shouldBlock - Whether navigation should currently be blocked.
 */
export const useNavigationGuard = (
  shouldBlock: boolean
): UseNavigationGuardReturn => {
  const blocker = useBlocker(shouldBlock);

  // Block hard navigations (refresh / tab close) with the native prompt
  useEffect(() => {
    if (!shouldBlock) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [shouldBlock]);

  const confirmNavigation = useCallback(() => {
    if (blocker.state === "blocked") {
      blocker.proceed();
    }
  }, [blocker]);

  const cancelNavigation = useCallback(() => {
    if (blocker.state === "blocked") {
      blocker.reset();
    }
  }, [blocker]);

  return {
    showLeaveDialog: blocker.state === "blocked",
    confirmNavigation,
    cancelNavigation,
  };
};
