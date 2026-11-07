import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router";
import { useAiAvailable } from "./ai-access";
import { dashboardBaseOf } from "./quiz-paths";

/**
 * Wraps an AI route. Anyone else who reaches it — an old bookmark, a typed URL — goes back to
 * their quiz list, as a player who types the Associations builder's URL does.
 */
export const RequireAi = ({ children }: { children: ReactNode }) => {
  const available = useAiAvailable();
  const { pathname } = useLocation();
  if (!available) return <Navigate to={`${dashboardBaseOf(pathname)}/quizzes`} replace />;
  return <>{children}</>;
};
