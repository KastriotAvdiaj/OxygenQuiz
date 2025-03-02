import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { QuizDetails } from "./components/quiz-details";
import { PublicQuestions } from "./components/public-questions";
import { PrivateQuestions } from "./components/private-questions";
import { useQuizForm } from "./use-quiz-form";
import { createQuizInputSchema } from "../../api/create-quiz";

export const CreateQuizForm = () => {
  const { queryData, handleSubmit, isSubmitting } = useQuizForm();

  if (queryData.isLoading) {
    return <div>Loading...</div>;
  }

  if (queryData.error) {
    return <div>Error loading quiz data</div>;
  }

  return (
    <div className="p-6 bg-background border-2">
      <h1 className="text-3xl font-bold mb-6">Create a New Quiz</h1>
      <Form
        id="create-quiz"
        onSubmit={handleSubmit}
        schema={createQuizInputSchema}
        options={{ mode: "onSubmit" }}
      >
        {(formProps) => (
          <div className="flex flex-col gap-8">
            <QuizDetails formProps={formProps} queryData={queryData} />

            <Separator className="my-6" />

            <PublicQuestions
              formProps={formProps}
              questions={queryData.questions}
            />

            <Separator className="my-6" />

            <PrivateQuestions formProps={formProps} queryData={queryData} />

            <Button
              type="submit"
              variant="addSave"
              disabled={isSubmitting}
              className="w-full"
            >
              {isSubmitting ? "Submitting..." : "Create Quiz"}
            </Button>
          </div>
        )}
      </Form>
    </div>
  );
};

export default CreateQuizForm;
