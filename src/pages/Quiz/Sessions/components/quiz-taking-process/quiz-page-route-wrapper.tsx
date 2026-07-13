import { Navigate, useParams, Link } from "react-router-dom";
import { AlertCircle, RefreshCw, LogIn } from "lucide-react";
import { QuizPage } from "./quiz-page";
import { GuestQuizPage } from "./guest-quiz-page";
import { useUser } from "@/lib/Auth";
import { useGuestCanPlay } from "../../api/guest-quiz-session";
import { LoadingWave } from "@/components/ui";
import { Button } from "@/components/ui/button";

/**
 * Singleplayer entry point — see docs/auth/guest-play.md. Logged-in users always get the full
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
    isError: isGuestStatusError,
    refetch: refetchGuestStatus,
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

  // Signed out from here down. Only treat the visitor as "guest quiz already spent"
  // when the backend actually told us so — if the can-play check itself failed we
  // must not silently bounce them to login as if they'd used their free quiz.
  if (isGuestStatusError) {
    return (
      <CantCheckGuestScreen
        onRetry={() => refetchGuestStatus()}
        loginTo={currentPath}
      />
    );
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

/**
 * Shown when we couldn't determine whether the signed-out visitor can play as a guest
 * (the /can-play request failed). Lets them retry or log in, rather than stalling.
 */
const CantCheckGuestScreen = ({
  onRetry,
  loginTo,
}: {
  onRetry: () => void;
  loginTo: string;
}) => (
  <div className="flex h-screen w-full items-center justify-center px-4">
    <div className="text-center space-y-6 max-w-md p-4">
      <AlertCircle className="h-16 w-16 mx-auto text-yellow-400" />
      <h2 className="text-2xl font-bold text-yellow-400">
        Couldn&apos;t start the quiz
      </h2>
      <p className="text-gray-300">
        We couldn&apos;t reach the server to start your quiz. Please try again, or
        log in to play.
      </p>
      <div className="flex gap-4 justify-center">
        <Button onClick={onRetry} className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4" />
          Try Again
        </Button>
        <Button asChild variant="outline">
          <Link to={`/login?redirectTo=${encodeURIComponent(loginTo)}`}>
            <LogIn className="h-4 w-4 mr-2" />
            Log In
          </Link>
        </Button>
      </div>
    </div>
  </div>
);
