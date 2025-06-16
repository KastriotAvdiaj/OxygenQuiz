import { Form, Input, Label, Textarea } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { useQuizForm } from "./use-quiz-form";
import {
  Brain,
  Trophy,
  PlusCircle,
  Clock,
  Eye,
  Shuffle,
  Upload,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import SelectQuestionComponent from "./components/question-select/question-select";
import { useQuiz } from "./Quiz-questions-context";
import { AnyQuestion } from "@/types/ApiTypes";
import { LiftedButton } from "@/common/LiftedButton";
import { CategorySelect } from "../../../Question/Entities/Categories/Components/select-question-category";
import { createQuizInputSchema, useCreateQuiz } from "../../api/create-quiz";
import { DifficultySelect } from "../../../Question/Entities/Difficulty/Components/select-question-difficulty";
import { LanguageSelect } from "../../../Question/Entities/Language/components/select-question-language";
import { Spinner, Switch } from "@/components/ui";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEffect, useState } from "react";
import { BsPatchQuestionFill } from "react-icons/bs";
import { useNotifications } from "@/common/Notifications";
import { useNavigate } from "react-router";
import { ExistingQuestionCard } from "./components/existing-quiz-question-card/existing-quiz-question-card";
import { QuestionSettingsCard } from "./components/quiz-question-settings";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useDisclosure } from "@/hooks/use-disclosure";
import { NewAnyQuestion, QuizQuestion } from "./types";
import {
  DEFAULT_NEW_MULTIPLE_CHOICE,
  DEFAULT_NEW_TRUE_FALSE,
  DEFAULT_NEW_TYPE_ANSWER,
} from "../../../Question/Components/Re-Usable-Components/constants";
import { NewQuestionCard } from "./components/new-quiz-question-card/new-quiz-question-card";
import { QuestionType } from "@/types/ApiTypes";
import { useCreateMultipleChoiceQuestion } from "../../../Question/api/Normal-Question/create-multiple-choice-question";
import { useCreateTrueFalseQuestion } from "../../../Question/api/True_False-Question/create-true_false-question";
import { useCreateTypeTheAnswerQuestion } from "../../../Question/api/Type_The_Answer-Question/create-type-the-answer-question";
// import { CreatedQuestionsPanel } from "./components/question-panel/questions-panel";

const CreateQuizForm = () => {
  const { queryData } = useQuizForm();
  const {
    addedQuestions,
    displayQuestion,
    getQuestionsWithSettings,
    addQuestionToQuiz,
  } = useQuiz();
  const { addNotification } = useNotifications();
  const navigate = useNavigate();

  const {
    isOpen: isAddQuestionDialogOpen,
    open: openAddQuestionDialog,
    close: closeAddQuestionDialog,
  } = useDisclosure();

  // Question creation mutations
  const createMultipleChoiceMutation = useCreateMultipleChoiceQuestion();
  const createTrueFalseMutation = useCreateTrueFalseQuestion();
  const createTypeTheAnswerMutation = useCreateTypeTheAnswerQuestion();

  const [isCreatingQuestions, setIsCreatingQuestions] = useState(false);
  const [activeTab, setActiveTab] = useState("quiz");

  // Type guards
  const isAnyQuestion = (q: any): q is AnyQuestion => {
    return (
      q && typeof q.id === "number" && "difficulty" in q && "category" in q
    );
  };

  const isNewAnyQuestion = (q: any): q is NewAnyQuestion => {
    return q && !("difficulty" in q) && !("category" in q);
  };

  const createNewMultipleChoiceQuestion = (id: number) => ({
    ...DEFAULT_NEW_MULTIPLE_CHOICE,
    id,
    answerOptions: DEFAULT_NEW_MULTIPLE_CHOICE.answerOptions.map((option) => ({
      ...option,
    })),
  });

  const createNewTrueFalseQuestion = (id: number) => ({
    ...DEFAULT_NEW_TRUE_FALSE,
    id,
  });

  const createNewTypeTheAnswerQuestion = (id: number) => ({
    ...DEFAULT_NEW_TYPE_ANSWER,
    id,
    acceptableAnswers: DEFAULT_NEW_TYPE_ANSWER.acceptableAnswers.map(
      (answer) => ({
        ...answer,
      })
    ),
  });

  // Function to create a new question based on its type
  const createNewQuestion = async (
    question: NewAnyQuestion
  ): Promise<number> => {
    switch (question.type) {
      case QuestionType.MultipleChoice:
        const mcResult = await createMultipleChoiceMutation.mutateAsync({
          data: question,
        });
        return mcResult.id;

      case QuestionType.TrueFalse:
        const tfResult = await createTrueFalseMutation.mutateAsync({
          data: question,
        });
        return tfResult.id;

      case QuestionType.TypeTheAnswer:
        const ttaResult = await createTypeTheAnswerMutation.mutateAsync({
          data: question,
        });
        return ttaResult.id;
    }
  };

  const createQuizMutation = useCreateQuiz({
    mutationConfig: {
      onSuccess: () => {
        addNotification({
          type: "success",
          title: "Success",
          message: "Your quiz was created successfully!",
        });
        navigate("/dashboard/quizzes");
      },
      onError: (error) => {
        console.error("Quiz creation error:", error);
        // Single error notification point
        addNotification({
          type: "error",
          title: "Error",
          message: "Failed to create quiz. Please try again.",
        });
      },
    },
  });

  const handleQuizSubmit = async (values: any) => {
    try {
      setIsCreatingQuestions(true);

      const questionsWithSettings = getQuestionsWithSettings();

      if (questionsWithSettings.length === 0) {
        addNotification({
          type: "error",
          title: "No questions selected",
          message: "Please add at least one question to your quiz.",
        });
        return;
      }

      const processedQuestions = await Promise.all(
        questionsWithSettings.map(async ({ question, settings }, index) => {
          let questionId: number;

          // If question has negative ID, it's a new question that needs to be created
          if (question.id < 0) {
            questionId = await createNewQuestion(question as NewAnyQuestion);
          } else {
            // Existing question, use its ID
            questionId = question.id;
          }

          return {
            questionId,
            timeLimitInSeconds: settings.timeLimitInSeconds,
            pointSystem: settings.pointSystem,
            orderInQuiz: settings.orderInQuiz || index,
          };
        })
      );

      // Create the quiz with all question IDs
      await createQuizMutation.mutateAsync({
        data: {
          ...values,
          questions: processedQuestions,
        },
      });
    } catch (error) {
      console.error("Error in quiz creation process:", error);
      // Single error notification point - only show if it's not already handled by mutation
      if (!createQuizMutation.isError) {
        addNotification({
          type: "error",
          title: "Error",
          message: "Failed to create quiz. Please try again.",
        });
      }
    } finally {
      setIsCreatingQuestions(false);
    }
  };

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

  return (
    <Form
      id="create-quiz"
      className="mt-0 w-full"
      onSubmit={handleQuizSubmit}
      schema={createQuizInputSchema}
      options={{ mode: "onSubmit" }}
    >
      {({ register, formState, setValue, watch, clearErrors }) => {
        useEffect(() => {
          const questions = addedQuestions.map(
            (q: QuizQuestion, index: number) => ({
              questionId: q.id,
              timeLimitInSeconds: 10,
              pointSystem: "Standard",
              orderInQuiz: index,
            })
          );
          setValue("questions", questions);
        }, [addedQuestions, setValue]);

        const { errors } = formState;
        const isSubmitting =
          createQuizMutation.isPending || isCreatingQuestions;

        return (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 p-4 items-start">
            {/* Quiz Details Sidebar */}
            <Card className="md:text-xs lg:text-sm h-fit md:col-span-1 bg-background border-2 border-primary/30">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <CardHeader className="w-full relative bg-primary/10 text-center border-b border-primary/30 px-2 py-4">
                  <TabsList className="w-full border-none bg-none shadow-none">
                    <TabsTrigger value="quiz">
                      <p className="flex gap-2 px-4 items-center">
                        <Brain
                          className={`h-5 w-5 ${
                            activeTab === "quiz" ? "text-white" : "text-primary"
                          }`}
                        />
                        Quiz Details
                      </p>
                    </TabsTrigger>
                    <TabsTrigger value="questions">
                      <p className="flex gap-2 px-4 items-center">
                        <BsPatchQuestionFill
                          className={`h-5 w-5 ${
                            activeTab === "questions"
                              ? "text-white"
                              : "text-primary"
                          }`}
                        />
                        Question Details
                      </p>
                    </TabsTrigger>
                  </TabsList>
                </CardHeader>

                <TabsContent value="questions" className="flex items-center">
                  <section className="flex flex-col gap-4 p-4">
                    {displayQuestion && (
                      <QuestionSettingsCard
                        question={displayQuestion}
                        showCopyActions={addedQuestions.length > 1}
                      />
                    )}
                  </section>
                </TabsContent>

                <TabsContent value="quiz">
                  <CardContent className="bg-background space-y-4">
                    {/* Basic Information */}
                    <div className="space-y-2">
                      <div>
                        <Label
                          htmlFor="title"
                          className="text-sm font-medium flex items-center gap-1"
                        >
                          Quiz Title <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          variant="quiz"
                          id="title"
                          placeholder="Enter quiz title..."
                          className="mt-1"
                          {...register("title")}
                          error={errors.title}
                        />
                      </div>

                      <div>
                        <Label
                          htmlFor="description"
                          className="text-sm font-medium"
                        >
                          Description
                        </Label>
                        <Textarea
                          variant="quiz"
                          id="description"
                          placeholder="Describe your quiz..."
                          className="mt-1 min-h-[80px] resize-none"
                          {...register("description")}
                          error={errors.description}
                        />
                      </div>
                    </div>

                    <Separator className="bg-primary/20" />

                    {/* Dropdowns */}
                    <div className="space-y-3">
                      <CategorySelect
                        categories={queryData.categories}
                        value={watch("categoryId")?.toString() || ""}
                        onChange={(selectedValue: string) =>
                          setValue("categoryId", parseInt(selectedValue, 10))
                        }
                        includeAllOption={false}
                        error={formState.errors["categoryId"]?.message}
                        clearErrors={() => clearErrors("categoryId")}
                      />

                      <DifficultySelect
                        difficulties={queryData.difficulties}
                        value={watch("difficultyId")?.toString() || ""}
                        onChange={(selectedValue: string) =>
                          setValue("difficultyId", parseInt(selectedValue, 10))
                        }
                        includeAllOption={false}
                        error={formState.errors["difficultyId"]?.message}
                        clearErrors={() => clearErrors("difficultyId")}
                      />

                      <LanguageSelect
                        languages={queryData.languages}
                        value={watch("languageId")?.toString() || ""}
                        includeAllOption={false}
                        onChange={(selectedValue: string) =>
                          setValue("languageId", parseInt(selectedValue, 10))
                        }
                        error={formState.errors["languageId"]?.message}
                        clearErrors={() => clearErrors("languageId")}
                      />
                    </div>

                    <Separator className="bg-primary/20" />

                    {/* Quiz Settings */}
                    <div className="space-y-4">
                      <h4 className="text-sm font-semibold text-primary flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        Quiz Settings
                      </h4>

                      <div>
                        <Label className="text-sm font-medium flex items-center gap-2 mb-2">
                          <Eye className="h-3 w-3" />
                          Visibility
                        </Label>
                        <Select
                          value={watch("visibility") || ""}
                          onValueChange={(value) =>
                            setValue("visibility", value)
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select visibility..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Public">Public</SelectItem>
                            <SelectItem value="Private">Private</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <Separator className="bg-primary/20" />

                    {/* Toggle Options */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold text-primary">
                        Options
                      </h4>

                      <div className="flex items-center justify-between">
                        <Label
                          htmlFor="showFeedback"
                          className="text-sm font-medium flex items-center gap-2"
                        >
                          💬 Instant Feedback
                        </Label>
                        <Switch
                          id="showFeedback"
                          checked={watch("showFeedbackImmediately") || false}
                          onCheckedChange={(checked) =>
                            setValue("showFeedbackImmediately", checked)
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <Label
                          htmlFor="shuffleQuestions"
                          className="text-sm font-medium flex items-center gap-2"
                        >
                          <Shuffle className="h-3 w-3" />
                          Shuffle Questions
                        </Label>
                        <Switch
                          id="shuffleQuestions"
                          checked={watch("shuffleQuestions") || false}
                          onCheckedChange={(checked) =>
                            setValue("shuffleQuestions", checked)
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <Label
                          htmlFor="isPublished"
                          className="text-sm font-medium flex items-center gap-2"
                        >
                          <Upload className="h-3 w-3" />
                          Publish Quiz
                        </Label>
                        <Switch
                          id="isPublished"
                          checked={watch("isPublished") || false}
                          onCheckedChange={(checked) =>
                            setValue("isPublished", checked)
                          }
                        />
                      </div>
                    </div>
                  </CardContent>
                </TabsContent>
              </Tabs>
            </Card>

            {/* Main Quiz Creator Area */}
            <Card className="bg-background justify-center border-2 border-primary/30 rounded-xl shadow-lg flex flex-col items-center w-full overflow-hidden md:col-span-3">
              <CardHeader className="w-full relative bg-primary/10 p-4 text-center border-b border-primary/30">
                <h2 className="text-2xl font-bold flex items-center justify-center gap-2">
                  <Trophy className="h-6 w-6 text-primary" />
                  Quiz Creator
                  <Trophy className="h-6 w-6 text-primary" />
                </h2>
                <p className="text-muted-foreground">
                  Craft your perfect quiz challenge!
                </p>

                <section className="flex absolute top-0 right-0 justify-center gap-4 p-4 rounded-lg">
                  <SelectQuestionComponent />
                  <Dialog
                    open={isAddQuestionDialogOpen}
                    onOpenChange={(open) =>
                      open ? openAddQuestionDialog() : closeAddQuestionDialog()
                    }
                  >
                    <DialogTrigger asChild>
                      <LiftedButton className="flex items-center gap-2">
                        + Create New
                      </LiftedButton>
                    </DialogTrigger>
                    <DialogContent className="bg-background p-4 rounded-md w-fit pt-8 dark:border border-foreground/30 max-w-4xl">
                      <DialogHeader>
                        <DialogTitle className="flex items-center justify-center">
                          Choose the type of question
                        </DialogTitle>
                      </DialogHeader>
                      <div className="flex flex-col gap-4 mt-4">
                        <div className="flex gap-4">
                          <LiftedButton
                            className="flex items-center gap-2"
                            onClick={() => {
                              const tempId = -Date.now();
                              const newQuestion =
                                createNewMultipleChoiceQuestion(tempId);
                              addQuestionToQuiz(newQuestion);
                              closeAddQuestionDialog();
                            }}
                          >
                            Multiple Choice
                          </LiftedButton>
                          <LiftedButton
                            className="flex items-center gap-2"
                            onClick={() => {
                              const tempId = -Date.now();
                              const newQuestion =
                                createNewTrueFalseQuestion(tempId);
                              addQuestionToQuiz(newQuestion);
                              closeAddQuestionDialog();
                            }}
                          >
                            True/False
                          </LiftedButton>
                          <LiftedButton
                            className="flex items-center gap-2"
                            onClick={() => {
                              const tempId = -Date.now();
                              const newQuestion =
                                createNewTypeTheAnswerQuestion(tempId);
                              addQuestionToQuiz(newQuestion);
                              closeAddQuestionDialog();
                            }}
                          >
                            Type The Answer
                          </LiftedButton>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </section>
              </CardHeader>

              <CardContent className="flex flex-col w-full p-4">
                {displayQuestion !== null ? (
                  isAnyQuestion(displayQuestion) ? (
                    <ExistingQuestionCard
                      key={displayQuestion.id}
                      question={displayQuestion}
                    />
                  ) : isNewAnyQuestion(displayQuestion) ? (
                    <NewQuestionCard
                      key={displayQuestion.id}
                      question={displayQuestion}
                    />
                  ) : (
                    <div>Unknown question type</div>
                  )
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground border-2 border-dashed border-primary/20 rounded-lg w-full">
                    <Brain className="h-16 w-16 mb-4 text-primary/50" />
                    <p className="mb-4 text-lg">Your quiz is feeling empty!</p>
                    <SelectQuestionComponent
                      triggerButton={
                        <Button
                          variant="outline"
                          type="button"
                          className="group hover:bg-primary hover:text-primary-foreground transition-all duration-300"
                        >
                          <PlusCircle className="mr-2 h-4 w-4 group-hover:rotate-90 transition-transform" />
                          Add Your First Question
                        </Button>
                      }
                    />
                  </div>
                )}

                <Separator className="my-6 bg-primary/20" />

                <LiftedButton
                  type="submit"
                  disabled={isSubmitting}
                  className="w-fit self-center relative"
                  variant="default"
                >
                  <div className="flex items-center justify-center">
                    <Spinner
                      size="sm"
                      className={`absolute ${
                        isSubmitting ? "visible" : "invisible"
                      }`}
                    />
                    <span className={isSubmitting ? "invisible" : "visible"}>
                      {isCreatingQuestions ? "Creating Questions..." : "Finish"}
                    </span>
                  </div>
                </LiftedButton>
              </CardContent>
            </Card>

            <div className="md:col-span-1">
              {/* <CreatedQuestionsPanel /> */}
            </div>
          </div>
        );
      }}
    </Form>
  );
};

export default CreateQuizForm;
