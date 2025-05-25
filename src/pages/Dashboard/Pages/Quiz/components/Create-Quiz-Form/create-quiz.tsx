import { Form } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { useQuizForm } from "./use-quiz-form";
// import { createQuizInputSchema } from "../../api/create-quiz";
import { useState } from "react";
import { Brain, PlusCircle, StarIcon, Trophy, Sparkles } from "lucide-react";
// import oxygen from "@/assets/besimiQuiz.png";
import z from "zod";
import { Card } from "@/components/ui";
import { createQuestionCategoryInputSchema } from "../../../Question/Entities/Categories/api/create-question-categories";
import SelectQuestionComponent from "./question-select";

// type FormValues = z.infer<typeof createQuizInputSchema>;

const defaultPrivateQuestion = {
  text: "",
  difficultyId: 21,
  languageId: 4,
  categoryId: 2042,
  timeLimit: 2,
  answerOptions: [
    { text: "", isCorrect: true },
    { text: "", isCorrect: false },
    { text: "", isCorrect: false },
    { text: "", isCorrect: false },
  ],
  score: 5,
};

const CreateQuizForm = () => {
  const {
    queryData,
    // handleSubmit,
    // isSubmitting,
  } = useQuizForm();
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);

  if (queryData.isLoading) {
    return (
      <div className="w-full h-64 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (queryData.error) {
    return (
      <div className="w-full p-8 text-center text-destructive">
        <Brain className="mx-auto h-16 w-16 mb-4 opacity-70" />
        <h3 className="text-xl font-bold">Oops! Brain freeze!</h3>
        <p>Error loading quiz data. Please try again.</p>
      </div>
    );
  }

  const handleFormSubmit = async () => {
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 3000);
    // return handleSubmit(data);
  };

  return (
    <>
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50">
          {/* This would be replaced with actual confetti animation in production */}
          <div className="absolute top-10 left-1/4 animate-bounce text-4xl">
            🎉
          </div>
          <div className="absolute top-20 right-1/3 animate-bounce delay-100 text-4xl">
            🎊
          </div>
          <div className="absolute top-40 left-1/2 animate-bounce delay-200 text-4xl">
            ✨
          </div>
          <div className="absolute top-60 right-1/4 animate-bounce delay-300 text-4xl">
            🎉
          </div>
          <div className="absolute top-80 left-1/3 animate-bounce delay-400 text-4xl">
            🎊
          </div>
        </div>
      )}

      <Card className="bg-background justify-center border-2 border-primary/30 rounded-xl shadow-lg flex flex-col gap-2 items-center w-full overflow-hidden">
        <div className="w-full bg-primary/10 p-4 text-center border-b border-primary/30">
          <h2 className="text-2xl font-bold flex items-center justify-center gap-2">
            <Trophy className="h-6 w-6 text-primary" />
            Quiz Creator
            <Trophy className="h-6 w-6 text-primary" />
          </h2>
          <p className="text-muted-foreground">
            Craft your perfect quiz challenge!
          </p>
        </div>

        <Form
          id="create-quiz"
          className="mt-0 w-full"
          onSubmit={handleFormSubmit}
          schema={createQuestionCategoryInputSchema}
          options={{ mode: "onSubmit" }}
        >
          {(formProps) => {
            // const {
            //   fields: privateQuestionFields,
            //   append: appendPrivateQuestion,
            //   remove: removePrivateQuestion,
            // } = useFieldArray({
            //   control: formProps.control,
            //   name: "privateQuestions",
            // });
            const { formState } = formProps;
            const { errors } = formState;
            console.log("Form errors:", errors);

            // const handleAddPrivateQuestion = () => {
            //   appendPrivateQuestion(defaultPrivateQuestion);
            //   setActiveQuestionIndex(privateQuestionFields.length);
            // };

            // const handleQuestionSelect = (index: number) => {
            //   setActiveQuestionIndex(index);
            // };

            // const handleRemoveQuestion = (index: number) => {
            //   removePrivateQuestion(index);
            //   setActiveQuestionIndex((prevIndex) =>
            //     prevIndex > 0 ? prevIndex - 1 : 0
            //   );
            // };

            return (
              <div className="flex flex-col md:flex-row gap-6 w-full ">
                <div className="flex-1 flex flex-col items-center p-4">
                  <div className="flex flex-col items-center gap-4 my-6 w-full">
                    {/* {privateQuestionFields.length > 0 ? (
                      <div className="w-full relative">
                        <div className="absolute -top-6 left-0 bg-primary text-primary-foreground text-sm px-3 py-1 rounded-t-md">
                          Question #{activeQuestionIndex + 1}
                        </div>
                        <div className="border-2 flex justify-center border-primary bg-primary/10 rounded-lg p-6 shadow-inner hover:shadow-md transition-all duration-300">
                          <PrivateQuestionForm
                            key={
                              privateQuestionFields[activeQuestionIndex]?.id ||
                              "empty"
                            }
                            index={activeQuestionIndex}
                            formProps={formProps}
                            removeQuestion={() =>
                              handleRemoveQuestion(activeQuestionIndex)
                            }
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground border-2 border-dashed border-primary/20 rounded-lg w-full">
                        <Brain className="h-16 w-16 mb-4 text-primary/50" />
                        <p className="mb-4 text-lg">
                          Your quiz is feeling empty!
                        </p>
                        <Button
                          onClick={handleAddPrivateQuestion}
                          variant="outline"
                          className="group hover:bg-primary hover:text-primary-foreground transition-all duration-300"
                        >
                          <PlusCircle className="mr-2 h-4 w-4 group-hover:rotate-90 transition-transform" />
                          Add Your First Question
                        </Button>
                      </div>
                    )} */}
                  </div>
                  <Separator className="my-6 bg-primary/20" />
                  {/* <LiftedButton
                    type="submit"
                    // variant="default"
                    disabled={isSubmitting}
                    className="w-fit group relative "
                  >
                    {isSubmitting ? (
                      <>
                        <span className="animate-pulse">Creating Quiz...</span>
                        <span className="animate-spin ml-2">⏳</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4 group-hover:rotate-12 transition-transform" />
                        Create Quiz
                      </>
                    )}
                  </LiftedButton> */}
                </div>
                <SelectQuestionComponent />
                <div className="border-l-2 border-primary/30 md:w-72 flex-shrink-0 bg-card/20">
                  {/* <CreatedQuestionsPanel
                    onAddPrivateQuestion={handleAddPrivateQuestion}
                    questions={privateQuestionFields}
                    difficulties={queryData.difficulties}
                    categories={queryData.categories}
                    onRemoveQuestion={() =>
                      handleRemoveQuestion(activeQuestionIndex)
                    }
                    onSelectQuestion={handleQuestionSelect}
                    activeQuestionIndex={activeQuestionIndex}
                  />
                  <div className="p-6 flex justify-center h-full border-t-2 border-primary/30 shadow-[0px_-1px_1px_rgba(0,0,0,0.1)]">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant={"fancy"} className="w-full group">
                          <StarIcon className="mr-2 h-4 w-4 group-hover:text-yellow-300 group-hover:rotate-45 transition-all duration-300" />
                          Quiz Details
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="bg-gradient-to-br from-background to-background/95 border-primary/20">
                        <QuizDetails
                          formProps={formProps}
                          queryData={queryData}
                        />
                      </DialogContent>
                    </Dialog>
                  </div> */}
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
