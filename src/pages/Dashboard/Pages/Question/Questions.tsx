import { Button } from "@/components/ui/button";
import { FormDrawer } from "@/components/ui/form";
import { NewQuestion } from "./Components/create-question";
import { Plus } from "lucide-react";
import { AdminQuestionCard } from "./Components/admin-question-card";
import { useQuestionData } from "./api/get-questions";
import { Spinner } from "@/components/ui/Spinner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Questions = () => {
  const questionsQuery = useQuestionData({});

  if (questionsQuery.isLoading) {
    return (
      <div className="flex h-48 w-full items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  const questions = questionsQuery.data || [];

  return (
    <div className="space-y-4 my-5 p-6">
      <Card className="p-5 bg-background-secondary border-none rounded-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-2xl font-bold">Questions Dashboard</CardTitle>
          <FormDrawer
            isDone={false}
            triggerButton={
              <Button
                variant="addSave"
                className="bg-text-hover rounded-sm text-white"
                size="sm"
                icon={<Plus className="size-4" />}
              >
                Create Question
              </Button>
            }
            title="Create Question"
            submitButton={
              <Button
                form="create-question"
                variant="addSave"
                className="rounded-sm text-white"
                type="submit"
              >
                Submit
              </Button>
            }
          >
            <NewQuestion />
          </FormDrawer>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {questions.map((question) => (
              <AdminQuestionCard key={question.id} question={question} />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
