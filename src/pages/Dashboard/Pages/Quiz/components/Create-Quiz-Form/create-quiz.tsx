import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { QuizDetails } from "./components/quiz-details";
import { PublicQuestions } from "./components/public-questions";
import { useQuizForm } from "./use-quiz-form";
import { createQuizInputSchema } from "../../api/create-quiz";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { CreatedQuestionsPanel } from "./components/questions-panel";

import { useFieldArray } from "react-hook-form";
import { PrivateQuestionForm } from "./components/private-question-form";

const defaultPrivateQuestion = {
  text: "",
  difficultyId: 0,
  languageId: 0,
  categoryId: 0,
  answerOptions: [
    { text: "", isCorrect: true },
    { text: "", isCorrect: false },
    { text: "", isCorrect: false },
    { text: "", isCorrect: false },
  ],
  score: 5,
};

const CreateQuizForm = () => {
  const { queryData, handleSubmit, isSubmitting } = useQuizForm();

  if (queryData.isLoading) {
    return <div>Loading...</div>;
  }

  if (queryData.error) {
    return <div>Error loading quiz data</div>;
  }

  return (
    <>
      <Card className="bg-background justify-center border-none flex flex-col gap-2 items-center w-full">
        <Form
          id="create-quiz"
          className="mt-0 w-full"
          onSubmit={handleSubmit}
          schema={createQuizInputSchema}
          options={{ mode: "onSubmit" }}
        >
          {(formProps) => {
            const {
              fields: privateQuestionFields,
              append: appendPrivateQuestion,
              remove: removePrivateQuestion,
            } = useFieldArray({
              control: formProps.control,
              name: "privateQuestions",
            });

            const handleAddPrivateQuestion = () => {
              appendPrivateQuestion(defaultPrivateQuestion);
            };

            return (
              <div className="flex flex-col md:flex-row gap-6 w-full">
                <div className="flex-1 p-6">
                  {/* <PublicQuestions
                    formProps={formProps}
                    questions={queryData.questions}
                  /> */}

                  <div className="flex flex-col gap-4 my-6">
                    <h2 className="text-2xl font-semibold mb-4">
                      Private Questions
                    </h2>
                    {privateQuestionFields.map((field, index) => (
                      <PrivateQuestionForm
                        key={field.id}
                        index={index}
                        formProps={formProps}
                        difficulties={queryData.difficulties}
                        categories={queryData.categories}
                        languages={queryData.languages}
                        removeQuestion={() => removePrivateQuestion(index)}
                      />
                    ))}
                  </div>
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

                <div className="border-l-2 border-muted md:w-72 flex-shrink-0">
                  {" "}
                  <CreatedQuestionsPanel
                    onAddPrivateQuestion={handleAddPrivateQuestion}
                    // onAddPublicQuestion={() => { /* Implement logic */ }}
                  />
                  <div className="p-6 flex justify-center">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant={"fancy"} className="w-full">
                          Quiz Details
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="bg-background">
                        {" "}
                        <QuizDetails
                          formProps={formProps}
                          queryData={queryData}
                        />
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </div>
            );
          }}
        </Form>
      </Card>
    </>
  );
};
export default CreateQuizForm;
