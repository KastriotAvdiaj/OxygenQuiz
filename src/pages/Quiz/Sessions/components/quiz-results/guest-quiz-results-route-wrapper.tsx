import { useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QuizResults } from "./quiz-results";
import { QuizLoadingView } from "../quiz-loading-view";
import {
  useGetGuestSessionResults,
  useFinishGuestSession,
} from "../../api/guest-quiz-session";

/**
 * Guest-play results page — see docs/auth/guest-play.md. Viewing this page is the moment the guest's
 * one free quiz is "spent": as soon as results load, it calls /finish, which deletes the session
 * on the backend (nothing about a guest attempt is persisted) and sets the cookie that blocks a
 * second free attempt from this browser. Both "play again" and "new quiz" route to signup,
 * since the guest's one attempt is already used by the time they see this page.
 */
export function GuestQuizResultsRouteWrapper() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const finishedRef = useRef(false);

  const {
    data: session,
    isLoading: loading,
    error,
  } = useGetGuestSessionResults({ sessionId: sessionId || "" });

  const finishMutation = useFinishGuestSession();

  useEffect(() => {
    if (session && sessionId && !finishedRef.current) {
      finishedRef.current = true;
      finishMutation.mutate({ sessionId });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, sessionId]);

  const goToSignup = () => navigate("/signup");

  // Same board as the logged-in results page — one loading look for the whole flow.
  if (loading) {
    return <QuizLoadingView words={["LOADING", "RESULTS"]} label="Loading your results" />;
  }

  if (error || !session) {
    return (
      <div className="flex flex-1 w-full items-center justify-center px-4">
        <div className="text-center space-y-6 max-w-md">
          <AlertCircle className="h-16 w-16 text-red-400 mx-auto" />
          <h2 className="text-2xl font-bold text-red-400">Unable to Load Results</h2>
          <p className="text-gray-300">
            This guest session may have already been viewed — guest results can only be viewed once.
          </p>
          <Button onClick={goToSignup}>Sign up to keep playing</Button>
        </div>
      </div>
    );
  }

  return (
    // See the note in quiz-results-route-wrapper.tsx — the old `h-64` pinned this to 16rem.
    // The banner keeps its natural height at the top; QuizResults centres in what is left.
    <div className="flex flex-1 flex-col pt-[var(--header-height,4rem)]">
      <div className="container mx-auto px-4 mb-4">
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-center text-sm">
          You played as a guest — this result won't be saved.{" "}
          <button onClick={goToSignup} className="font-semibold text-primary underline">
            Sign up
          </button>{" "}
          to save your progress and unlock multiplayer.
        </div>
      </div>
      <QuizResults
        session={session}
        onRetryQuiz={goToSignup}
        onSelectNewQuiz={goToSignup}
      />
    </div>
  );
}
