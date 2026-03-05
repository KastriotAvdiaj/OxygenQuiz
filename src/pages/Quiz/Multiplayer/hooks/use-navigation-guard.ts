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
 * Uses two complementary mechanisms:
 * 1. `useBlocker` (react-router-dom) — intercepts in-app route changes
 *    (browser back / forward, programmatic navigate, link clicks).
 * 2. `beforeunload` event — catches hard navigations like tab close,
 *    browser refresh, or typing a new URL. The browser shows its native
 *    "Leave site?" dialog for these cases.
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
