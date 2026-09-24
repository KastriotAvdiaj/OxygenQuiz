import { useEffect, useRef } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QuizLoadingView } from "@/pages/Quiz/Sessions/components/quiz-loading-view";
import { associationGameKeys, startAssociationGame } from "../api/association-play";

/**
 * `/associations/:quizId/play` — starts a Solo game and hands over to the game's own URL,
 * `/associations/play/:sessionId`, replacing this entry. So a refresh, Back, or a bookmark lands
 * on the game rather than starting another, and "start" happens once per visit.
 *
 * If the player already has this board running, the server returns that game instead of a new
 * one (`resumed: true`), and the game page says so and offers a fresh start.
 * See docs/quiz/associations.md, "Playing".
 */
export const AssociationStartRoute = () => {
  const { quizId } = useParams<{ quizId: string }>();
  const [searchParams] = useSearchParams();
  const shareToken = searchParams.get("shareToken") ?? undefined;
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const start = useMutation({
    mutationFn: () => startAssociationGame(Number(quizId), shareToken),
    onSuccess: (view) => {
      queryClient.setQueryData(associationGameKeys.detail(view.sessionId), view);
      navigate(`/associations/play/${view.sessionId}`, {
        replace: true,
        state: { resumed: view.resumed },
      });
    },
  });

  // Starting a game is the reason this route exists, so it runs on arrival — the same shape as
  // the Classic play route's session creation. The ref keeps StrictMode's double mount from
  // posting twice (the second post would be answered "resumed", which is true but confusing).
  const started = useRef(false);
  useEffect(() => {
    if (started.current || !quizId) return;
    started.current = true;
    start.mutate();
  }, [quizId, start]);

  if (start.isError) {
    return (
      <div className="flex flex-1 w-full items-center justify-center px-4">
        <div className="max-w-md space-y-5 text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-destructive" />
          <h2 className="text-xl font-bold">Couldn&apos;t start this board</h2>
          <p className="text-muted-foreground">{start.error.message}</p>
          <div className="flex justify-center gap-3">
            <Button onClick={() => start.mutate()}>Try again</Button>
            <Button asChild variant="outline">
              <Link to="/choose-quiz">Back to quizzes</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return <QuizLoadingView label="Setting up the board" />;
};
