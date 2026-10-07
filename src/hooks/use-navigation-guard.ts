import { useEffect, useCallback, useRef } from "react";
import { useBlocker } from "react-router-dom";

interface UseNavigationGuardReturn {
  showLeaveDialog: boolean;
  confirmNavigation: () => void;
  cancelNavigation: () => void;
  /**
   * Lets every navigation from here on through without asking. Call it right before a
   * navigation the screen itself makes once the work is safe — the redirect after a quiz is
   * created — or the guard would stop the user on their own success.
   */
  allowNavigation: () => void;
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
  shouldBlock: boolean,
): UseNavigationGuardReturn => {
  /**
   * The blocker reads these at navigation time rather than at render time, so that
   * `allowNavigation()` followed by `navigate()` in the same handler goes through — a boolean
   * passed to `useBlocker` would still hold the value from the last render.
   */
  const shouldBlockRef = useRef(shouldBlock);
  shouldBlockRef.current = shouldBlock;
  const allowedRef = useRef(false);

  const blocker = useBlocker(
    useCallback(() => shouldBlockRef.current && !allowedRef.current, []),
  );

  // Block hard navigations (refresh / tab close) with the native prompt
  useEffect(() => {
    if (!shouldBlock) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (allowedRef.current) return;
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

  const allowNavigation = useCallback(() => {
    allowedRef.current = true;
  }, []);

  return {
    showLeaveDialog: blocker.state === "blocked",
    confirmNavigation,
    cancelNavigation,
    allowNavigation,
  };
};
