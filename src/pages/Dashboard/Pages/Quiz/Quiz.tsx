import { QueryClient } from "@tanstack/react-query";
import { LoaderFunctionArgs, useParams } from "react-router";
import { getQuizQueryOptions, useQuizData } from "./api/get-quiz";
import { CardContent, CardHeader, Spinner } from "@/components/ui";
import { ContentLayout } from "@/layouts/individual-content-layout";
import { Edit2, EyeOff, Eye, Share2, BarChart3 } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { DeleteQuiz } from "./components/delete-quiz";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { QuizProperties } from "./components/quiz-properties";
import { QuizQuestions } from "./components/quiz-questions";
import { useNavigate } from "react-router";
import { LiftedButton } from "@/common/LiftedButton";
import { handleLoaderError } from "@/lib/loaderError";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useMemo } from "react";

export const quizLoader =
  (queryClient: QueryClient) =>
  async ({ params }: LoaderFunctionArgs) => {
    const quizId = Number(params.quizId as string);

    if (isNaN(quizId) || quizId <= 0) {
      throw new Error("Invalid quiz ID");
    }

    const quizQuery = getQuizQueryOptions(quizId);

    const quiz = await handleLoaderError(async () => {
      const cachedData = queryClient.getQueryData(quizQuery.queryKey);
      return cachedData || queryClient.fetchQuery(quizQuery);
    });

    return { quiz };
  };

export const QuizRoute = () => {
  const params = useParams();
  const quizId = Number(params.quizId as string);
  const quizQuery = useQuizData({ quizId });
  const navigate = useNavigate();

  // Memoize derived data to prevent unnecessary recalculations
  const quizStats = useMemo(() => {
    if (!quizQuery.data) return null;

    const quiz = quizQuery.data;
    return {
      //difficulty level doens't make sense
      estimatedDuration: Math.ceil(quiz.timeLimitInSeconds / 60),
      difficultyLevel:
        quiz.questionCount > 20
          ? "Hard"
          : quiz.questionCount > 10
          ? "Medium"
          : "Easy",
      status: quiz.isPublished ? "Published" : "Draft",
    };
  }, [quizQuery.data]);

  if (quizQuery.isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Spinner size="lg" />
          <p className="text-muted-foreground">Loading quiz...</p>
        </div>
      </div>
    );
  }

  if (quizQuery.isError) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-destructive font-medium">Failed to load quiz</p>
          <Button variant="outline" onClick={() => quizQuery.refetch()}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  const quiz = quizQuery.data;
  if (!quiz) return null;

  return (
    <ContentLayout title={`Quiz #${quiz.id}`}>
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h1 className="font-bold text-3xl">{quiz.title}</h1>
              <Badge
                variant={quiz.isPublished ? "default" : "secondary"}
                className={quiz.isPublished ? "bg-green-500 text-white" : ""}
              >
                {quizStats?.status}
              </Badge>
            </div>

            {/* Quick Stats */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <BarChart3 className="h-4 w-4" />
                {quiz.questionCount} questions
              </span>
              <span>•</span>
              <span>{quizStats?.estimatedDuration} min</span>
              <span>•</span>
              <span>{quiz.category.name}</span>
            </div>
          </div>

          <div className="md:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  Actions
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => navigate(`/quiz/${quiz.id}/edit`)}
                >
                  <Edit2 className="h-4 w-4 mr-2" />
                  Edit Quiz
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </DropdownMenuItem>
                <DropdownMenuItem>
                  {quiz.isPublished ? (
                    <>
                      <EyeOff className="h-4 w-4 mr-2" />
                      Unpublish
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4 mr-2" />
                      Publish
                    </>
                  )}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="questions">
              Questions ({quiz.questionCount})
            </TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <div className="mt-6">
            <TabsContent value="overview" className="space-y-6">
              {/* Description Section */}
              {quiz.description && (
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">Description</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {quiz.description}
                  </p>
                </div>
              )}

              {/* Enhanced Properties */}
              <QuizProperties quiz={quiz} />
            </TabsContent>

            <TabsContent value="questions">
              <QuizQuestions />
            </TabsContent>

            <TabsContent value="analytics" className="space-y-4">
              <div className="text-center py-8">
                <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  Analytics will be available once the quiz has responses
                </p>
              </div>
            </TabsContent>
          </div>
        </Tabs>

        <Separator />

        {/* Enhanced Action Section */}
        <section className="flex flex-col sm:flex-row justify-between gap-4">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                /* Share functionality */
              }}
            >
              <Share2 className="h-4 w-4 mr-2" />
              Share Quiz
            </Button>
          </div>

          <div className="hidden md:flex gap-2 text-sm">
            <LiftedButton
              className="bg-background hover:bg-muted text-foreground border-foreground"
              onClick={() => {
                /* Toggle publish state */
              }}
            >
              {quiz.isPublished ? (
                <>
                  <EyeOff className="h-4 w-4 mr-2" />
                  Unpublish
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4 mr-2" />
                  Publish
                </>
              )}
            </LiftedButton>

            <LiftedButton onClick={() => navigate(`/quiz/${quiz.id}/edit`)}>
              <Edit2 className="h-4 w-4 mr-2" />
              Edit Quiz
            </LiftedButton>

            <DeleteQuiz
              useLiftedButton={true}
              className="w-fit bg-red-500 hover:bg-red-600"
              finished={() => navigate("/dashboard/quizzes")}
              id={quiz.id}
            />
          </div>
        </section>
      </CardContent>
    </ContentLayout>
  );
};
