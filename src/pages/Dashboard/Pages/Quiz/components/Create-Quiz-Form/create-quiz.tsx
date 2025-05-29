import { Form } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { useQuizForm } from "./use-quiz-form";
// import { createQuizInputSchema } from "../../api/create-quiz";
import { Brain, Trophy, PlusCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createQuestionCategoryInputSchema } from "../../../Question/Entities/Categories/api/create-question-categories";
import SelectQuestionComponent from "./question-select";
import { useQuiz } from "./QuizQuestionsContext";
import { AnyQuestion } from "@/types/ApiTypes";
import { LiftedButton } from "@/common/LiftedButton";
import { CreatedQuestionsPanel } from "./components/questions-panel";
import { QuestionCard } from "@/pages/Question/User-question-components/common-question-card";

const CreateQuizForm = () => {
  const {
    queryData,
    // handleSubmit,
    // isSubmitting,
  } = useQuizForm();

  const { selectedQuestions, displayQuestion } = useQuiz();

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
    const finalQuizData = {
      questionsFromBank: selectedQuestions.map((q: AnyQuestion) => q.id),
    };
    console.log("Submitting Quiz with Data:", finalQuizData);
  };

  return (
    <div className="min-h-screen flex items-start gap-4">
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
            const { formState } = formProps;
            const { errors } = formState;
            console.log("Form errors:", errors);

            return (
              <div className="flex">
                <div className="flex-1 flex flex-col p-4">
                  {displayQuestion !== null ? (
                    <QuestionCard question={displayQuestion} />
                  ) : (
                    <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground border-2 border-dashed border-primary/20 rounded-lg w-full">
                      <Brain className="h-16 w-16 mb-4 text-primary/50" />
                      <p className="mb-4 text-lg">
                        Your quiz is feeling empty!
                      </p>
                      <Button
                        // onClick={handleAddPrivateQuestion}
                        variant="outline"
                        className="group hover:bg-primary hover:text-primary-foreground transition-all duration-300"
                      >
                        <PlusCircle className="mr-2 h-4 w-4 group-hover:rotate-90 transition-transform" />
                        Add Your First Question
                      </Button>
                    </div>
                  )}

                  <Separator className="my-6 bg-primary/20" />
                  <Button
                    type="submit" // This button will trigger the main form's onSubmit
                    disabled={false /* isSubmitting */}
                    className="w-fit self-center"
                    variant="default"
                  >
                    Create Quiz
                  </Button>
                </div>

                <div className="md:w-[400px] lg:w-[200px] flex-shrink-0 p-1 ">
                  <section className="flex flex-col justify-center gap-4 p-4 rounded-lg">
                    <SelectQuestionComponent />
                    <LiftedButton>+ Create New</LiftedButton>
                  </section>
                </div>
              </div>
            );
          }}
        </Form>
      </Card>
      <div className=" md:w-72 flex-shrink-0 min-w-[300px] bg-card/20">
        <CreatedQuestionsPanel />
      </div>
    </div>
  );
};

export default CreateQuizForm;
