import { QueryClient } from "@tanstack/react-query";
import { LoaderFunctionArgs, useParams } from "react-router";
import { getQuizQueryOptions, useQuizData } from "./api/get-quiz";
import {
  Button,
  CardContent,
  CardDescription,
  CardHeader,
  Spinner,
} from "@/components/ui";
import { ContentLayout } from "@/layouts/individual-content-layout";
import formatDate from "@/lib/date-format";
import {
  Calendar,
  Clock,
  Edit2,
  Eye,
  EyeOff,
  Globe,
  Hash,
  List,
  Tag,
  Target,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { DeleteQuiz } from "./components/delete-quiz";

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
      {/* <Card className="border-0 shadow-none"> */}
      <CardHeader className="flex flex-col space-y-0">
        <p className="font-semibold text-2xl">{quiz.title}</p>
        <CardDescription>Basic information about the quiz.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-6">
          <h2 className="text-lg font-semibold">Description</h2>
          <p className="text-muted-foreground">{quiz.description}</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <Hash className="h-5 w-5 text-muted-foreground" />
            <span className="font-medium">ID:</span>
            <span>{quiz.id}</span>
          </div>
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-muted-foreground" />
            <span className="font-medium">Language:</span>
            <span>{quiz.language}</span>
          </div>
          <div className="flex items-center gap-2">
            <Tag className="h-5 w-5 text-muted-foreground" />
            <span className="font-medium">Category:</span>
            <span>{quiz.category}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <span className="font-medium">Time Limit:</span>
            <span>{quiz.timeLimit} minutes</span>
          </div>
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-muted-foreground" />
            <span className="font-medium">Passing Score:</span>
            <span>{quiz.passingScore}%</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <span className="font-medium">Created At:</span>
            <span>{formatDate(quiz.createdAt)}</span>
          </div>
          <div className="flex items-center gap-2">
            {quiz.isPublished ? (
              <Eye className="h-5 w-5 text-green-500" />
            ) : (
              <EyeOff className="h-5 w-5 text-red-500" />
            )}
            <span className="font-medium">Published:</span>
            <span>{quiz.isPublished ? "Yes" : "No"}</span>
          </div>
          <div className="flex items-center gap-2">
            <List className="h-5 w-5 text-muted-foreground" />
            <span className="font-medium">Number of Questions:</span>
            <span>{quiz.numberOfQuestions}</span>
          </div>
        </div>
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
      {/* </Card> */}
    </ContentLayout>
  );
};
