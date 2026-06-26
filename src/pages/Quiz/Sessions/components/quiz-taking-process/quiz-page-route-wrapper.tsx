import { Navigate, useParams } from "react-router-dom";
import { QuizPage } from "./quiz-page";
import { GuestQuizPage } from "./guest-quiz-page";
import { useUser } from "@/lib/Auth";
import { useGuestCanPlay } from "../../api/guest-quiz-session";
import { LoadingWave } from "@/components/ui";

/**
 * Singleplayer entry point — see docs/guest-play.md. Logged-in users always get the full
 * (persisted, resumable) flow. Signed-out visitors get one free guest attempt per browser
 * (a soft, cookie-based limit) before being sent to log in. Multiplayer has no such fallback:
 * it stays fully gated behind login at the route level (see Router.tsx).
 */
export const QuizPageRouteWrapper = () => {
  const { quizId } = useParams<{ quizId: string }>();
  const { data: user, isLoading: isUserLoading } = useUser();
  const currentPath = window.location.pathname;
  const userId = user?.id;

  const {
    data: guestStatus,
    isLoading: isGuestStatusLoading,
  } = useGuestCanPlay({ enabled: !isUserLoading && !userId });

  // Add some simple validation.
  if (!quizId) {
    return <div>Error: Quiz ID is missing from the URL.</div>;
  }

  if (isUserLoading || (!userId && isGuestStatusLoading)) {
    return (
      <div className="flex justify-center items-center py-16">
        <LoadingWave size="lg" />
      </div>
    );
  }

  if (userId) {
    return <QuizPage quizId={parseInt(quizId, 10)} userId={userId} />;
  }

  if (guestStatus?.canPlay) {
    return <GuestQuizPage quizId={parseInt(quizId, 10)} />;
  }

  // Not logged in and the free guest quiz is already spent.
  return (
    <Navigate
      to={`/login?redirectTo=${encodeURIComponent(currentPath)}&guestUsed=1`}
      replace
    />
  );
};
