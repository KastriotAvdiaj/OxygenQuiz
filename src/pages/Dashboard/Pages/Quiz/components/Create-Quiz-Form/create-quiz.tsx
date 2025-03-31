import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { QuizDetails } from "./components/quiz-details";
import { useQuizForm } from "./use-quiz-form";
import { createQuizInputSchema } from "../../api/create-quiz";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { CreatedQuestionsPanel } from "./components/questions-panel";
import { useState } from "react";
import { useFieldArray } from "react-hook-form";
import { PrivateQuestionForm } from "./components/private-question-form";

const defaultPrivateQuestion = {
  text: "",
  difficultyId: 21,
  languageId: 4,
  categoryId: 2042,
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
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);

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
            const { formState } = formProps;
            const { errors } = formState;
            console.log("Form errors:", errors);

            const handleAddPrivateQuestion = () => {
              appendPrivateQuestion(defaultPrivateQuestion);
              // Set active index to the newly added question
              setActiveQuestionIndex(privateQuestionFields.length);
            };

            // Handler for clicking on a question in the panel
            const handleQuestionSelect = (index: number) => {
              setActiveQuestionIndex(index);
            };

            return (
              <div className="flex flex-col md:flex-row gap-6 w-full">
                <div className="flex-1 flex flex-col items-center p-4">
                  <div className="flex flex-col gap-4 my-6 w-full">
                    {privateQuestionFields.length > 0 ? (
                      // Show only the active question
                      <PrivateQuestionForm
                        key={
                          privateQuestionFields[activeQuestionIndex]?.id ||
                          "empty"
                        }
                        index={activeQuestionIndex}
                        formProps={formProps}
                        difficulties={queryData.difficulties}
                        categories={queryData.categories}
                        languages={queryData.languages}
                        removeQuestion={() =>
                          removePrivateQuestion(activeQuestionIndex)
                        }
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                        <p className="mb-4">No questions added yet</p>
                        <Button
                          onClick={handleAddPrivateQuestion}
                          variant="outline"
                        >
                          Add Your First Question
                        </Button>
                      </div>
                    )}
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
                  <CreatedQuestionsPanel
                    onAddPrivateQuestion={handleAddPrivateQuestion}
                    questions={privateQuestionFields}
                    difficulties={queryData.difficulties}
                    categories={queryData.categories}
                    onRemoveQuestion={removePrivateQuestion}
                    onSelectQuestion={handleQuestionSelect}
                    activeQuestionIndex={activeQuestionIndex}
                  />
                  <div className="p-6 flex justify-center">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant={"fancy"} className="w-full">
                          Quiz Details
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="bg-background">
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
