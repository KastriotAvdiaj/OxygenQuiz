import { Form, Input, Label, Textarea } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { useQuizForm } from "./use-quiz-form";
import {
  Brain,
  Clock,
  Eye,
  Shuffle,
  Folder,
  MessageSquareText,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import SelectQuestionComponent from "./components/question-select/question-select";
import { useQuiz } from "./Quiz-questions-context";
import { AnyQuestion } from "@/types/question-types";
import { LiftedButton } from "@/common/LiftedButton";
import { CategorySelect } from "../../../Question/Entities/Categories/Components/select-question-category";
import {
  CreateQuizInput,
  createQuizInputSchema,
  useCreateQuiz,
} from "../../api/create-quiz";
import { DifficultySelect } from "../../../Question/Entities/Difficulty/Components/select-question-difficulty";
import { LanguageSelect } from "../../../Question/Entities/Language/components/select-question-language";
import { Spinner, Switch } from "@/components/ui";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEffect, useState } from "react";
import { useNotifications } from "@/common/Notifications";
import { useNavigate, useLocation } from "react-router";
import { ExistingQuestionCard } from "./components/existing-display-quiz-question-card/main-display-quiz-question-export";
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
} from "./constants";
import { NewQuestionCard } from "./components/new-display-quiz-question-card/main-display-quiz-question-card";
import { QuestionType } from "@/types/question-types";
import { useCreateMultipleChoiceQuestion } from "../../../Question/api/Multiple_Choice_Question/create-multiple-choice-question";
import { useCreateTrueFalseQuestion } from "../../../Question/api/True_False-Question/create-true_false-question";
import { useCreateTypeTheAnswerQuestion } from "../../../Question/api/Type_The_Answer-Question/create-type-the-answer-question";
import { CreatedQuestionsPanel } from "./components/question-panel/questions-panel";
import ImageUpload from "@/utils/Image-Upload";
import { useUpdateQuiz, isVersionConflictError } from "../../api/update-quiz";
import { useCreateAiQuiz, AiImportQuestion } from "../../api/create-ai-quiz";
import { Quiz } from "@/types/quiz-types";

interface CreateQuizFormProps {
  /**
   * Edit mode: the quiz being edited (loaded at its current version). The form is
   * prefilled from it and submits an update instead of a create. Questions are seeded
   * separately through QuizQuestionProvider's initialQuestions.
   */
  editQuiz?: Quiz;
  /**
   * Create mode: seed the quiz-level fields. Used by the AI wizard, which collects the
   * title / category / language / difficulty / settings up front and then hands off to
   * this form for review and submission. Ignored when `editQuiz` is set.
   */
  initialValues?: Partial<CreateQuizInput>;
  /**
   * AI review mode: submit through the atomic `/quiz/ai-import` endpoint (questions + quiz
   * created in one transaction) instead of the per-question loop, so a failed save can't
   * leave orphan questions. See docs/quiz/ai-quiz-architecture.md §7.
   */
  aiImportMode?: boolean;
}

const CreateQuizForm = ({
  editQuiz,
  initialValues,
  aiImportMode = false,
}: CreateQuizFormProps = {}) => {
  const isEditMode = editQuiz != null;
  const { queryData } = useQuizForm();
  const {
    addedQuestions,
    displayQuestion,
    getQuestionsWithSettings,
    addQuestionToQuiz,
    setDisplayQuestion,
    getQuestionErrors,
    validateAllQuestionsForSubmit,
    resetAllValidationStates,
    activeTab,
    setActiveTab,
  } = useQuiz();
  const { addNotification } = useNotifications();
  const navigate = useNavigate();
  const location = useLocation();
  // This form is mounted under both the admin dashboard (/dashboard/...) and the
  // personal dashboard (/my-dashboard/...). Redirect back into whichever section
  // the user is actually in — a normal user has no access to /dashboard and would
  // otherwise be bounced to a 404 after creating a quiz.
  const dashboardBase = location.pathname.startsWith("/my-dashboard")
    ? "/my-dashboard"
    : "/dashboard";

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
  // const [activeTab, setActiveTab] = useState("quiz");

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
      }),
    ),
  });

  // Function to create a new question based on its type
  const createNewQuestion = async (
    question: NewAnyQuestion,
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
        navigate(`${dashboardBase}/quizzes`);
      },
      onError: (error) => {
        // Notification is raised by handleQuizSubmit, which knows whether questions were
        // already created (and can tell the user they were saved rather than lost).
        console.error("Quiz creation error:", error);
      },
    },
  });

  const createAiQuizMutation = useCreateAiQuiz({
    mutationConfig: {
      onSuccess: () => {
        addNotification({
          type: "success",
          title: "Success",
          message: "Your quiz was created successfully!",
        });
        navigate(`${dashboardBase}/quizzes`);
      },
      onError: (error) => {
        console.error("AI quiz import error:", error);
        addNotification({
          type: "error",
          title: "Error",
          message: "Failed to create quiz. Please try again.",
        });
      },
    },
  });

  const updateQuizMutation = useUpdateQuiz({
    mutationConfig: {
      onSuccess: () => {
        addNotification({
          type: "success",
          title: "Success",
          message: "Your changes were saved!",
        });
        // Only the admin dashboard has a per-quiz detail route; the personal
        // dashboard just has the quizzes list.
        navigate(
          dashboardBase === "/my-dashboard"
            ? "/my-dashboard/quizzes"
            : `/dashboard/quiz/${editQuiz?.id}`,
        );
      },
      onError: (error) => {
        console.error("Quiz update error:", error);
        if (isVersionConflictError(error)) {
          // Optimistic-concurrency conflict: the quiz changed since this form was
          // loaded (another tab or device). Saving now would overwrite those changes.
          addNotification({
            type: "error",
            title: "Quiz changed elsewhere",
            message:
              "This quiz was modified since you opened it. Reload the page to get the latest version — your unsaved changes will be lost.",
          });
          return;
        }
        addNotification({
          type: "error",
          title: "Error",
          message: "Failed to save changes. Please try again.",
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

      // NEW: Validate all questions for submit (this marks all as validated and returns boolean)
      const isValid = validateAllQuestionsForSubmit();

      if (!isValid) {
        // Find the first question with errors and display it
        const firstErrorQuestion = addedQuestions.find((question) => {
          if (question.id < 0) {
            const errors = getQuestionErrors(question.id);
            return errors.length > 0;
          }
          return false;
        });

        if (firstErrorQuestion) {
          setDisplayQuestion(firstErrorQuestion);
        }

        addNotification({
          type: "error",
          title: "Validation Error",
          message:
            "Please fix the validation errors in your questions before creating the quiz.",
        });
        return;
      }

      // AI review mode: create questions + quiz atomically through /quiz/ai-import so a
      // failed save can't leave orphan questions. New questions travel inline; existing
      // ones (added from the bank during review) travel as ids.
      if (aiImportMode && !isEditMode) {
        const importQuestions: AiImportQuestion[] = questionsWithSettings.map(
          ({ question, settings }, index) => {
            const base = {
              difficultyId:
                (question as NewAnyQuestion).difficultyId ??
                values.difficultyId,
              pointSystem: settings.pointSystem,
              timeLimitInSeconds: settings.timeLimitInSeconds,
              orderInQuiz: settings.orderInQuiz || index,
            };

            // Existing question picked from the bank during review.
            if (question.id > 0) {
              return { ...base, existingQuestionId: question.id };
            }

            const nq = question as NewAnyQuestion;
            if (nq.type === QuestionType.MultipleChoice) {
              return {
                ...base,
                type: QuestionType.MultipleChoice,
                text: nq.text,
                imageUrl: nq.imageUrl,
                answerOptions: nq.answerOptions.map((o) => ({
                  text: o.text,
                  isCorrect: o.isCorrect,
                })),
                allowMultipleSelections: nq.allowMultipleSelections,
              };
            }
            if (nq.type === QuestionType.TrueFalse) {
              return {
                ...base,
                type: QuestionType.TrueFalse,
                text: nq.text,
                imageUrl: nq.imageUrl,
                correctAnswerBoolean: nq.correctAnswer,
              };
            }
            return {
              ...base,
              type: QuestionType.TypeTheAnswer,
              text: nq.text,
              imageUrl: nq.imageUrl,
              correctAnswerText: nq.correctAnswer,
              acceptableAnswers: nq.acceptableAnswers.map((a) => a.value),
              isCaseSensitive: nq.isCaseSensitive,
              allowPartialMatch: nq.allowPartialMatch,
            };
          },
        );

        await createAiQuizMutation.mutateAsync({
          data: {
            title: values.title,
            description: values.description,
            categoryId: values.categoryId,
            languageId: values.languageId,
            difficultyId: values.difficultyId,
            status: values.status,
            showFeedbackImmediately: values.showFeedbackImmediately,
            shuffleQuestions: values.shuffleQuestions,
            imageUrl: values.imageUrl,
            questions: importQuestions,
          },
        });

        resetAllValidationStates();
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
        }),
      );

      if (isEditMode && editQuiz) {
        // Save the edit at the version the quiz was loaded at — the backend uses it
        // to reject stale writes (409) and to version the question changes so
        // in-flight players finish the version they started (docs/quiz/quiz-editing.md).
        await updateQuizMutation.mutateAsync({
          data: {
            ...values,
            id: editQuiz.id,
            version: editQuiz.version,
            questions: processedQuestions,
          },
        });
      } else {
        // Manual create is questions-first by design: the questions are created (above),
        // then the quiz. If the quiz step fails, the questions the user authored are
        // deliberately KEPT in their bank — they're real work worth reusing — so we tell
        // the user that instead of a generic error. (The AI flow, which returns earlier,
        // is atomic precisely because its questions are throwaway. See
        // docs/quiz/ai-quiz-architecture.md §10a.)
        const createdNewQuestions = questionsWithSettings.some(
          ({ question }) => question.id < 0,
        );
        try {
          await createQuizMutation.mutateAsync({
            data: {
              ...values,
              questions: processedQuestions,
            },
          });
        } catch (createError) {
          if (createdNewQuestions) {
            addNotification({
              type: "warning",
              title: "Quiz not created — your questions were saved",
              message:
                "We couldn't create the quiz, but the questions you just made were saved to your question bank. You can reuse them to build a quiz.",
            });
          } else {
            addNotification({
              type: "error",
              title: "Error",
              message: "Failed to create quiz. Please try again.",
            });
          }
          return; // handled here; skip the generic outer handler
        }
      }

      // NEW: Reset all validation states after successful submission
      resetAllValidationStates();
    } catch (error) {
      console.error("Error in quiz save process:", error);
      // Single error notification point - only show if it's not already handled by mutation
      if (
        !createQuizMutation.isError &&
        !updateQuizMutation.isError &&
        !createAiQuizMutation.isError
      ) {
        addNotification({
          type: "error",
          title: "Error",
          message: isEditMode
            ? "Failed to save changes. Please try again."
            : "Failed to create quiz. Please try again.",
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
      id={isEditMode ? "edit-quiz" : "create-quiz"}
      className="mt-0 w-full lg:h-full"
      onSubmit={handleQuizSubmit}
      schema={createQuizInputSchema}
      options={{
        mode: "onSubmit",
        // Edit mode: prefill every quiz-level field from the loaded quiz.
        // Create mode: prefill from initialValues when a caller supplied them (AI wizard).
        defaultValues: editQuiz
          ? {
              title: editQuiz.title,
              description: editQuiz.description ?? "",
              categoryId: editQuiz.category.id,
              languageId: editQuiz.language.id,
              difficultyId: editQuiz.difficulty.id,
              imageUrl: editQuiz.imageUrl ?? "",
              timeLimitInSeconds: editQuiz.timeLimitInSeconds,
              showFeedbackImmediately: editQuiz.showFeedbackImmediately,
              status: editQuiz.status,
              shuffleQuestions: editQuiz.shuffleQuestions,
              questions: [],
            }
          : initialValues
            ? { ...initialValues, questions: [] }
            : undefined,
      }}
    >
      {({ register, formState, setValue, watch, clearErrors }) => {
        useEffect(() => {
          const questions = addedQuestions.map(
            (q: QuizQuestion, index: number) => ({
              questionId: q.id,
              timeLimitInSeconds: 10,
              pointSystem: "Standard",
              orderInQuiz: index,
            }),
          );
          setValue("questions", questions);
        }, [addedQuestions, setValue]);

        const { errors } = formState;
        const isSubmitting =
          createQuizMutation.isPending ||
          updateQuizMutation.isPending ||
          createAiQuizMutation.isPending ||
          isCreatingQuestions;

        const [imageUrl, setImageUrl] = useState(editQuiz?.imageUrl ?? "");

        useEffect(() => {
          if (imageUrl) {
            setValue("imageUrl", imageUrl);
          }
        }, [imageUrl, setValue]);

        const handleImageUpload = (url: string) => {
          setImageUrl(url);
          setValue("imageUrl", url);
        };
        const handleImageRemove = () => {
          setImageUrl("");
          setValue("imageUrl", "");
        };

        return (
          <div className="mx-auto w-full max-w-[1600px] grid grid-cols-1 lg:grid-cols-5 gap-3 sm:gap-4 items-start lg:h-full lg:min-h-0 lg:overflow-hidden">
            {/* Quiz Details Sidebar */}
            <Card className="md:text-xs lg:text-sm h-fit lg:h-full lg:col-span-1 bg-background border-2 border-primary/30 flex flex-col lg:overflow-hidden">
              <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="flex flex-1 flex-col min-h-0"
              >
                <CardHeader className="w-full relative bg-primary/10 text-center border-b border-primary/30 px-2 py-3 flex-none">
                  <TabsList className="w-full border-none bg-none shadow-none ">
                    <TabsTrigger value="quiz" className="rounded-xl">
                      <p className="flex gap-2 px-4 items-center text-[10px]">
                        <Folder
                          className={`h-3 w-3 ${
                            activeTab === "quiz" ? "text-white" : "text-primary"
                          }`}
                        />
                        Quiz Details
                      </p>
                    </TabsTrigger>
                    <TabsTrigger value="questions" className="rounded-xl">
                      <p className="flex gap-2 px-4 items-center text-[10px]">
                        <MessageSquareText
                          className={`h-3 w-3 ${
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

                <TabsContent
                  value="questions"
                  className="flex items-center justify-center w-full"
                >
                  <section className="flex flex-col gap-4 p-4 w-full">
                    {addedQuestions.length === 0 ? (
                      <div className="text-muted-foreground text-center py-8">
                        No questions added yet
                      </div>
                    ) : displayQuestion ? (
                      <QuestionSettingsCard
                        question={displayQuestion}
                        showCopyActions={addedQuestions.length > 1}
                      />
                    ) : null}
                  </section>
                </TabsContent>

                <TabsContent
                  value="quiz"
                  className="flex-1 min-h-0 overflow-hidden mt-0"
                >
                  <CardContent className="bg-background space-y-4 h-full overflow-y-auto scrollbar-thin py-3">
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
                          variant={errors.title ? "isIncorrect" : "minimal"}
                          id="title"
                          placeholder="Enter quiz title"
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
                          variant="minimal"
                          id="description"
                          placeholder="Describe your quiz"
                          className="mt-1 min-h-[80px] resize-none"
                          {...register("description")}
                          error={errors.description}
                        />
                      </div>
                    </div>
                    <Separator className="bg-primary/20" />

                    {/* <ImageUpload
                      onUpload={handleImageUpload}
                      onRemove={handleImageRemove}
                      initialImageUrl={editQuiz?.imageUrl ?? null}
                    /> */}

                    {/* Dropdowns */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold text-primary flex items-center gap-1">
                        Filters
                      </h4>
                      <CategorySelect
                        categories={queryData.categories}
                        fieldVariant="form"
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
                        fieldVariant="form"
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
                        fieldVariant="form"
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
                        Settings
                      </h4>

                      <div>
                        <Label className="text-xs font-medium flex items-center gap-2 mb-2">
                          Status
                        </Label>
                        <Select
                          value={watch("status") || "Draft"}
                          onValueChange={(value) =>
                            setValue(
                              "status",
                              value as "Draft" | "Unlisted" | "Public",
                            )
                          }
                        >
                          <SelectTrigger
                            variant={errors.status ? "incorrect" : "form"}
                            className="w-full"
                          >
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent
                            variant={errors.status ? "incorrect" : "form"}
                          >
                            <SelectItem
                              variant={errors.status ? "incorrect" : "form"}
                              value="Draft"
                            >
                              Draft — only you can see it
                            </SelectItem>
                            <SelectItem
                              variant={errors.status ? "incorrect" : "form"}
                              value="Unlisted"
                            >
                              Unlisted — playable via share link
                            </SelectItem>
                            <SelectItem
                              variant={errors.status ? "incorrect" : "form"}
                              value="Public"
                            >
                              Public — listed for everyone
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        {errors.status && (
                          <p className="text-sm text-red-500 mt-1">
                            {errors.status.message
                              ? errors.status.message
                              : "Please select a status."}
                          </p>
                        )}
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
                          Instant Feedback
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
                    </div>
                  </CardContent>
                </TabsContent>
              </Tabs>
            </Card>

            {/* Main Quiz Creator Area */}
            <Card className="bg-background border-2 border-primary/30 rounded-xl shadow-lg flex flex-col items-center w-full lg:col-span-3 lg:h-full lg:overflow-hidden">
              <CardHeader className="w-full relative bg-primary/10 p-3 text-center border-b border-primary/30 flex-none">
                <section className="flex justify-center gap-4 rounded-lg">
                  <SelectQuestionComponent />
                  <Dialog
                    open={isAddQuestionDialogOpen}
                    onOpenChange={(open) =>
                      open ? openAddQuestionDialog() : closeAddQuestionDialog()
                    }
                  >
                    <DialogTrigger asChild>
                      <LiftedButton
                        type="button"
                        className="flex items-center gap-2"
                      >
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
                            type="button"
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
                            type="button"
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
                            type="button"
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

              <CardContent className="flex flex-col w-full flex-1 min-h-0 overflow-y-auto p-3">
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
                ) : null}
              </CardContent>
              <CardFooter className="flex-none py-3">
                <section className="w-full items-center flex justify-center">
                  <LiftedButton
                    type="submit"
                    disabled={isSubmitting}
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
                        {isCreatingQuestions
                          ? "Creating Questions..."
                          : isEditMode
                            ? "Save Changes"
                            : "Finish"}
                      </span>
                    </div>
                  </LiftedButton>
                </section>
              </CardFooter>
            </Card>

            <div className="lg:col-span-1 lg:h-full lg:min-h-0">
              <CreatedQuestionsPanel />
            </div>
          </div>
        );
      }}
    </Form>
  );
};

export default CreateQuizForm;
