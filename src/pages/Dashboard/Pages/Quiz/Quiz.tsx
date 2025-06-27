import { QueryClient } from "@tanstack/react-query";
import { LoaderFunctionArgs, useParams } from "react-router";
import { getQuizQueryOptions, useQuizData } from "./api/get-quiz";
import { CardContent, CardHeader, Spinner } from "@/components/ui";
import { ContentLayout } from "@/layouts/individual-content-layout";
import { Edit2, EyeOff } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { DeleteQuiz } from "./components/delete-quiz";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { QuizProperties } from "./components/quiz-properties";
import { QuizQuestions } from "./components/quiz-questions";
import { useNavigate } from "react-router";
import { LiftedButton } from "@/common/LiftedButton";
import { handleLoaderError } from "@/lib/loaderError";

export const quizLoader =
  (queryClient: QueryClient) =>
  async ({ params }: LoaderFunctionArgs) => {
    const quizId = Number(params.quizId as string);
    // ... validation

    const quizQuery = getQuizQueryOptions(quizId);

    // This is the corrected implementation
    const quiz = await handleLoaderError(() => {
      const cachedData = queryClient.getQueryData(quizQuery.queryKey);

      // If data is in the cache, resolve it as a promise immediately.
      // Otherwise, fetch it (which already returns a promise).
      return cachedData
        ? Promise.resolve(cachedData)
        : queryClient.fetchQuery(quizQuery);
    });

    return { quiz };
  };
export const QuizRoute = () => {
  const params = useParams();
  const quizId = Number(params.quizId as string);
  const quizQuery = useQuizData({ quizId });
  const navigate = useNavigate();

  if (quizQuery.isLoading)
    return (
      <div className="w-full h-full flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );

  // if (quizQuery.isError) {
  //   return (
  //     <div className="w-full h-full flex items-center justify-center">
  //       Failed to load quiz. Try again later.
  //     </div>
  //   ); NOT needed here, handled by loader error
  // }

  const quiz = quizQuery.data;
  if (!quiz) return null; // Should not happen on initial load due to the loader

  return (
    <ContentLayout title={`Quiz #${quiz.id}`}>
      <CardHeader className="flex flex-col space-y-0">
        <p className="font-semibold text-2xl">{quiz.title}</p>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="questions">
              Questions({quiz.questionCount})
            </TabsTrigger>
          </TabsList>
          <Separator className="my-6" />
          <TabsContent value="questions">
            <QuizQuestions />
          </TabsContent>
          <TabsContent value="overview">
            <div className="mb-6">
              <h2 className="text-lg font-semibold">Description</h2>
              <p className="text-muted-foreground">{quiz.description}</p>
            </div>
            {quiz && <QuizProperties quiz={quiz} />}
          </TabsContent>
        </Tabs>
        <Separator className="mt-6" />
        <section className="mt-6 flex justify-end gap-2 text-sm">
          {/* 
          ///
          /// TODO: Add unpublish functionality
          /// ALSO: Make it dynamic (if published, say unpublish, else say publish)
          ///
          */}
          <LiftedButton className="bg-background hover:bg-muted text-foregound border-foreground">
            <EyeOff size={16} />
            Unpublish
          </LiftedButton>
          <LiftedButton>
            <Edit2 size={16} />
            Edit
          </LiftedButton>
          <DeleteQuiz
            useLiftedButton={true}
            className="w-fit bg-destructive"
            finished={() => navigate("/dashboard/quiz")}
            id={quiz.id}
          />
        </section>
      </CardContent>
    </ContentLayout>
  );
};
