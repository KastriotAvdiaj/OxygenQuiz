import React from "react";
import { Form } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { useQuizForm } from "./use-quiz-form";
// import { createQuizInputSchema } from "../../api/create-quiz";
import { Brain, Trophy, ListChecks, Trash2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createQuestionCategoryInputSchema } from "../../../Question/Entities/Categories/api/create-question-categories";
import SelectQuestionComponent from "./question-select";
import { useQuiz } from "./QuizQuestionsContext";
import { AnyQuestion } from "@/types/ApiTypes";
import { QuestionCard } from "@/pages/Question/User-question-components/common-question-card";

// A simple component to display a summary of a selected question
// You can make this more detailed or use a variation of your QuestionCard
const SelectedQuestionItem: React.FC<{
  question: AnyQuestion;
  onRemove: (id: number) => void;
}> = ({ question, onRemove }) => {
  return (
    <div className="flex items-center justify-between p-2 mb-2 border rounded-md bg-muted/50 hover:bg-muted/30 transition-colors">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" title={question.text}>
          {question.text}
        </p>
        <p className="text-xs text-muted-foreground">
          ID: {question.id} | Type: {question.type} | Difficulty:{" "}
          {question.difficulty.level}
        </p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="text-destructive hover:bg-destructive/10"
        onClick={() => onRemove(question.id)}
        aria-label={`Remove question ${question.id}`}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
};

const CreateQuizForm = () => {
  const {
    queryData,
    // handleSubmit,
    // isSubmitting,
  } = useQuizForm();

  const { selectedQuestions, removeQuestionFromQuiz } = useQuiz();

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
    // Prepare your final quiz data here, including selectedQuestions
    const finalQuizData = {
      // ...other quiz details like title, description from your form...
      questionsFromBank: selectedQuestions.map((q: AnyQuestion) => q.id), // Or send full objects if your API expects that
      // privateQuestions: formProps.getValues("privateQuestions"), // If you have privately created questions
    };
    console.log("Submitting Quiz with Data:", finalQuizData);
    // return handleSubmit(finalQuizData);
  };

  return (
    <>
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

        {/*
            NOTE: The <Form> component here seems to be from a library (react-hook-form with a custom wrapper perhaps).
            The `onSubmit` for this form will likely handle the quiz metadata (title, description, etc.).
            The `selectedQuestions` are managed by the context and will be available in `handleFormSubmit`.
          */}
        <Form
          id="create-quiz"
          className="mt-0 w-full"
          onSubmit={handleFormSubmit} // This onSubmit now has access to selectedQuestions via closure
          schema={createQuestionCategoryInputSchema} // This schema is for category, likely need a quiz schema
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
                {/* Left Side: Quiz Form Fields / Private Questions (if any) */}
                <div className="flex-1 flex flex-col p-4">
                  {/* Placeholder for your Quiz Title, Description, etc. form fields */}
                  <Card className="mb-6">
                    <CardHeader>
                      <CardTitle>Quiz Details</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {/*
                          Example:
                          <FormField
                            control={formProps.control}
                            name="title"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Quiz Title</FormLabel>
                                <FormControl>
                                  <Input placeholder="Enter quiz title" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          // ... other fields for description, category, difficulty etc.
                        */}
                      <p className="text-muted-foreground">
                        Form fields for quiz title, description, etc. will go
                        here. These will be part of `formProps` and handled by
                        your `Form` component.
                      </p>
                    </CardContent>
                  </Card>

                  {/* Area to display currently selected questions from the bank */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <ListChecks className="h-5 w-5 text-primary" />
                        Selected Questions ({selectedQuestions.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="max-h-96 overflow-y-auto pr-2">
                      {" "}
                      {/* Added scroll for many questions */}
                      {selectedQuestions.length > 0 ? (
                        selectedQuestions.map((q: AnyQuestion) => (
                          // <SelectedQuestionItem
                          //   key={q.id}
                          //   question={q}
                          //   onRemove={removeQuestionFromQuiz}
                          // />
                          <QuestionCard key={q.id} question={q} />
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No questions selected from the bank yet.
                        </p>
                      )}
                    </CardContent>
                  </Card>

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

                {/* Middle: Question Selection Component */}
                <div className="md:w-[600px] lg:w-[700px] flex-shrink-0 p-1">
                  {" "}
                  {/* Adjust width as needed */}
                  <h3 className="text-lg font-semibold mb-3 text-center">
                    Select Questions from Bank
                  </h3>
                  <SelectQuestionComponent />
                </div>

                {/* Right Side Panel (Your existing structure) */}
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
                  <div className="p-4">
                    <h3 className="text-md font-semibold mb-2 text-muted-foreground">
                      Quiz Summary & Actions
                    </h3>
                    {/* Placeholder for your existing right panel content */}
                    <p className="text-xs text-muted-foreground">
                      (Content from CreatedQuestionsPanel and QuizDetails dialog
                      trigger will go here)
                    </p>
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
