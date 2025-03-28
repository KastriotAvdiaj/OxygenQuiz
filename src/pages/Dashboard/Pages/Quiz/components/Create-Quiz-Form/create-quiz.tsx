import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { QuizDetails } from "./components/quiz-details";
import { PublicQuestions } from "./components/public-questions";
import { PrivateQuestions } from "./components/private-questions";
import { useQuizForm } from "./use-quiz-form";
import { createQuizInputSchema } from "../../api/create-quiz";
import { Card, CardDescription, CardHeader } from "@/components/ui";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { useDisclosure } from "@/hooks/use-disclosure";
import { PlusCircle, Search, SearchCheck } from "lucide-react";
import { CreatedQuestionsPanel } from "./components/questions-panel";

export const CreateQuizForm = () => {
  const { queryData, handleSubmit, isSubmitting } = useQuizForm();
  // const { close, open, isOpen } = useDisclosure();

  if (queryData.isLoading) {
    return <div>Loading...</div>;
  }

  if (queryData.error) {
    return <div>Error loading quiz data</div>;
  }

  return (
    <>
      <div className="flex flex-col space-y-2 p-4 justify-center items-center text-primary"></div>
      <Card className="bg-background justify-center border-none flex flex-col gap-2 items-center">
        <Form
          id="create-quiz"
          className="mt-0 w-full"
          onSubmit={handleSubmit}
          schema={createQuizInputSchema}
          options={{ mode: "onSubmit" }}
        >
          {(formProps) => (
            <div className="flex flex-col md:flex-row gap-6">
              {/* Main Section: Public/Private Questions */}
              <div className="flex-1 p-6">
                <PublicQuestions
                  formProps={formProps}
                  questions={queryData.questions}
                />
                <PrivateQuestions formProps={formProps} queryData={queryData} />
                <Separator className="my-6" />
                <Button
                  type="submit"
                  variant="default"
                  disabled={isSubmitting}
                  className="w-fit"
                >
                  {isSubmitting ? "Submitting..." : "Create Quiz"}
                </Button>
              </div>
              <div className="border-l-2 border-muted">
                <CreatedQuestionsPanel
                  privateQuestionButton={<Button>Add Private Question</Button>}
                  publicQuestionButton={<Button>Add Public Question</Button>}
                />
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant={"fancy"}>Quiz Details</Button>
                  </DialogTrigger>
                  <DialogContent className="flex justify-center items-center bg-background">
                    <QuizDetails formProps={formProps} queryData={queryData} />
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          )}
        </Form>
      </Card>
    </>
  );
};

export default CreateQuizForm;
