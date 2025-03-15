import { QueryClient } from "@tanstack/react-query";
import { LoaderFunctionArgs, useParams } from "react-router";
import { getQuizQueryOptions, useQuizData } from "./api/get-quiz";
import { Button, CardContent, CardHeader, Spinner } from "@/components/ui";
import { ContentLayout } from "@/layouts/individual-content-layout";
import { Edit2, EyeOff } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { DeleteQuiz } from "./components/delete-quiz";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { QuizProperties } from "./components/quiz-properties";

export const quizLoader =
  (queryClient: QueryClient) =>
  async ({ params }: LoaderFunctionArgs) => {
    const quizId = Number(params.quizId as string);

    const quizQuery = getQuizQueryOptions(quizId);

    const promise =
      queryClient.getQueryData(quizQuery.queryKey) ??
      (await queryClient.fetchQuery(quizQuery));

    const quiz = await Promise.resolve(promise);

    return { quiz };
  };
export const QuizRoute = () => {
  const params = useParams();
  const quizId = Number(params.quizId as string);

  const quizQuery = useQuizData({ quizId });

  if (quizQuery.isLoading)
    return (
      <div className="w-full h-full flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );

  if (quizQuery.isError) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        Failed to load quiz. Try again later.
      </div>
    );
  }

  const quiz = quizQuery.data;
  if (!quiz) return null;

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
              Questions({quiz.numberOfQuestions})
            </TabsTrigger>
          </TabsList>
          <TabsContent value="public"></TabsContent>
          <TabsContent value="private"></TabsContent>
        </Tabs>
        <Separator className="my-6" />

        {/* 
        Create a file that has these details in an array and then map over them for cleaner code
        */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold">Description</h2>
          <p className="text-muted-foreground">{quiz.description}</p>
        </div>
        {quiz && <QuizProperties quiz={quiz} />}
        <Separator className="mt-6" />
        <section className="mt-6 flex justify-end gap-2">
          {/* 
          ///
          /// TODO: Add unpublish functionality
          /// ALSO: Make it dynamic (if published, say unpublish, else say publish)
          ///
          */}
          <Button className="bg-background hover:bg-muted text-foregound border-foreground">
            <EyeOff size={16} />
            Unpublish
          </Button>
          <Button>
            <Edit2 size={16} />
            Edit
          </Button>
          <DeleteQuiz id={quiz.id} />
        </section>
      </CardContent>
    </ContentLayout>
  );
};
