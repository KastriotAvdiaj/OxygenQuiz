import { CreateQuestionForm } from "./Components/create-question";
import { AdminQuestionCard } from "./Components/admin-question-card";
import { useQuestionData } from "./api/get-questions";
import { Spinner } from "@/components/ui/Spinner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FolderMinus } from "lucide-react";
import { useQuestionCategoryData } from "./Categories/api/get-question-categories";
import { useNotifications } from "@/common/Notifications";

export const Questions = () => {
  const { addNotification } = useNotifications();

  const questionsQuery = useQuestionData({});
  const questionCategoriesQuery = useQuestionCategoryData({});

  if (questionsQuery.isLoading || questionCategoriesQuery.isLoading) {
    return (
      <div className="flex h-48 w-full items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  const questions = questionsQuery.data || [];
  const questionCategories = questionCategoriesQuery.data || [];


  return (
    <div className="space-y-4 my-5 p-6">
      <Card className="p-5 bg-background-secondary border-none rounded-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-2xl font-bold">
            Questions Dashboard
          </CardTitle>
          <CreateQuestionForm categories={questionCategories}/>
        </CardHeader>
        <CardContent className="mt-10">
          <div className="space-y-6">
            {questions.length === 0 && (
              <div className="w-full flex items-center justify-center gap-3 ">
                <FolderMinus size={30} />
                <p className="text-xl">No questions found.</p>
              </div>
            )}
            {questions.map((question) => (
              <AdminQuestionCard key={question.id} question={question} />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
