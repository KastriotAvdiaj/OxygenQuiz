import { Navigate, useParams, Link } from "react-router-dom";
import { AlertCircle, LogIn } from "lucide-react";

import { Button } from "@/components/ui/button";
import { LoadingWave } from "@/components/ui";
import { useUser } from "@/lib/Auth";

import { useSharedQuiz } from "../../api/get-shared-quiz";

/**
 * Entry point for a share link: `/play/shared/:token`.
 *
 * This route is what `buildShareUrl` has been producing all along, and it did not exist — the
 * copied link 404'd into the catch-all. Resolving the token is only half of it: the token also has
 * to reach session creation as `QuizSessionCM.ShareToken`, or the quiz loads and then refuses to
 * start. Both halves were listed as the remaining client wiring in docs/quiz/quiz-visibility.md.
 *
 * <b>It does not start the quiz.</b> Landing on a share link used to drop the recipient straight
 * into question 1 with the clock already running — they had not seen the title, the length, or
 * what it was about, and the first thing the link did was start timing them. So this route
 * resolves the token and hands off to the catalogue with the quiz's normal start dialog open:
 * the same "here is the quiz, do you want to play it?" step everyone else gets from the grid.
 *
 * The resolve happens *here* rather than after the redirect so the two failure modes stay on
 * this route, where the URL still explains them — a bad token shows a bad-link screen instead of
 * silently landing on the catalogue with nothing open. The catalogue then re-reads the same
 * query key from cache, so the hand-off costs no second request.
 *
 * <b>Login is required, unlike `/quiz/:quizId/play`.</b> That route falls back to one free guest
 * attempt; this one cannot. Guest play is restricted to Public quizzes server-side, and the
 * resolve endpoint is `[Authorize]` on purpose — the token grants access, the account is what ties
 * the play to a person. So a signed-out visitor is sent to log in and returned here afterwards,
 * rather than being offered a guest run that the backend would reject.
 */
export const SharedQuizRouteWrapper = () => {
  const { token } = useParams<{ token: string }>();
  const { data: user, isLoading: isUserLoading } = useUser();
  const userId = user?.id;

  // Resolve only once we know there is a signed-in user: the endpoint is [Authorize], so asking
  // while signed out buys a guaranteed 401 and an error screen the visitor can't act on.
  const {
    data: quiz,
    isLoading: isQuizLoading,
    isError,
  } = useSharedQuiz({
    token: token ?? "",
    queryConfig: { enabled: Boolean(token) && Boolean(userId) },
  });

  if (!token) return <BadLinkScreen />;

  if (isUserLoading) {
    return (
      <div className="flex flex-1 justify-center items-center py-16">
        <LoadingWave size="lg" />
      </div>
    );
  }

  // `window.location.pathname` rather than a built string: the token is already in the URL and
  // this is the path we want to come back to, verbatim.
  if (!userId) {
    return (
      <Navigate
        to={`/login?redirectTo=${encodeURIComponent(window.location.pathname)}`}
        replace
      />
    );
  }

  if (isQuizLoading) {
    return (
      <div className="flex flex-1 justify-center items-center py-16">
        <LoadingWave size="lg" />
      </div>
    );
  }

  // One message for every "no". The backend 404s an unknown token and a token whose quiz went
  // back to Draft alike, and telling those apart would leak whether a token ever existed.
  if (isError || !quiz) return <BadLinkScreen />;

  // Hand off to the catalogue, which opens the start dialog for this quiz. `replace` so Back
  // returns wherever the recipient came from rather than bouncing through this resolver again.
  return <Navigate to={`/choose-quiz?shared=${encodeURIComponent(token)}`} replace />;
};

const BadLinkScreen = () => (
  // flex-1, not h-screen: sized by the layout's viewport column (docs/RESPONSIVE.md).
  <div className="flex flex-1 w-full items-center justify-center px-4">
    <div className="text-center space-y-6 max-w-md p-4">
      <AlertCircle className="h-16 w-16 mx-auto text-yellow-400" />
      <h2 className="text-2xl font-bold text-yellow-400">
        This link doesn&apos;t work
      </h2>
      <p className="text-muted-foreground">
        The share link is invalid, or the quiz behind it is no longer shared. Ask
        whoever sent it for a new link.
      </p>
      <Button asChild variant="outline">
        <Link to="/choose-quiz">
          <LogIn className="h-4 w-4 mr-2" />
          Browse quizzes
        </Link>
      </Button>
    </div>
  </div>
);
