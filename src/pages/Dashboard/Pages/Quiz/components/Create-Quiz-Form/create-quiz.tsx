import { Form } from "@/components/ui/form";
import { useQuizForm } from "./use-quiz-form";
import {
  Brain,
  Folder,
  MessageSquareText,
  Plus,
  ArrowRight,
  Save,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { useQuiz } from "./Quiz-questions-context";
import { AnyQuestion } from "@/types/question-types";
import { LiftedButton } from "@/common/LiftedButton";
import {
  CreateQuizInput,
  createQuizInputSchema,
  useCreateQuiz,
} from "../../api/create-quiz";
import { Spinner, BlobLoader } from "@/components/ui";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useNotifications } from "@/common/Notifications";
import { useNavigate, useLocation } from "react-router";
import { ExistingQuestionCard } from "./components/existing-display-quiz-question-card/main-display-quiz-question-export";
import { QuestionSettingsCard } from "./components/quiz-question-settings";
import { NewAnyQuestion, QuizQuestion } from "./types";
import { inheritQuizClassification } from "./inherit-quiz-classification";
import { isUnspecifiedLookup } from "../../../Question/Entities/lookup-visibility";
import { NewQuestionCard } from "./components/new-display-quiz-question-card/main-display-quiz-question-card";
import { QuestionType } from "@/types/question-types";
import { useCreateMultipleChoiceQuestion } from "../../../Question/api/Multiple_Choice_Question/create-multiple-choice-question";
import { useCreateTrueFalseQuestion } from "../../../Question/api/True_False-Question/create-true_false-question";
import { useCreateTypeTheAnswerQuestion } from "../../../Question/api/Type_The_Answer-Question/create-type-the-answer-question";
import { CreatedQuestionsPanel } from "./components/question-panel/questions-panel";
// import ImageUpload from "@/utils/Image-Upload";
import { useUpdateQuiz, isVersionConflictError } from "../../api/update-quiz";
import { useCreateAiQuiz, AiImportQuestion } from "../../api/create-ai-quiz";
import { Quiz } from "@/types/quiz-types";
import { useUser } from "@/lib/Auth";
import { useDraftAutosave } from "@/hooks/use-draft-autosave";
import { useNavigationGuard } from "@/hooks/use-navigation-guard";
import { DraftSavedIndicator, LeaveUnfinishedQuizDialog } from "../draft-notices";
import { DESKTOP_QUERY, useMediaQuery } from "@/hooks/use-media-query";
import { AddQuestionMenu } from "./components/add-question-menu";
import { QuizDetailsFields } from "./components/quiz-details-fields";
import { QuizOverview } from "./components/overview/quiz-overview";
import {
  ManualQuizDraft,
  QUIZ_DRAFT_SLOTS,
  QUIZ_DRAFT_VERSION,
  isManualQuizDraftWorthKeeping,
} from "../quiz-drafts";

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
  /**
   * Called once the quiz has been written to the server, before the redirect.
   *
   * The AI wizard uses it to drop the draft it is keeping: the builder it renders in review
   * mode is a child of the wizard, so a successful save here is what tells the wizard its
   * reply is no longer unfinished work.
   */
  onSaved?: () => void;
  /**
   * AI review only: the overview's Back button — discard and return to the brief, or save as a
   * draft and leave (docs/quiz/quiz-overview.md).
   */
  reviewBack?: { onDiscard: () => void; costsAGeneration: boolean };
  /** AI review only: the import report, rendered by the overview under Back. */
  reviewNotices?: ReactNode;
}

const CreateQuizForm = ({
  editQuiz,
  initialValues,
  aiImportMode = false,
  onSaved,
  reviewBack,
  reviewNotices,
}: CreateQuizFormProps = {}) => {
  const isEditMode = editQuiz != null;
  const { queryData } = useQuizForm();
  const {
    addedQuestions,
    displayQuestion,
    getQuestionsWithSettings,
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
  const { data: user } = useUser();

  /**
   * Only the *manual create* flow keeps a local draft.
   *
   * Edit mode is out because the quiz already has a server record and an optimistic-concurrency
   * story to go with it — a local copy of a half-edited quiz would race the 409 that
   * `updateQuizMutation` relies on to protect changes made elsewhere. AI review mode is out
   * because the wizard already persists the generated payload under its own slot; a second
   * snapshot of the same questions would mean two offers to restore one quiz.
   */
  const draftsEnabled = !editQuiz && !aiImportMode;

  /**
   * The autosave and leave-guard hooks live inside the `<Form>` render prop, because that is
   * where the form's values are — but the mutation callbacks below are defined out here. These
   * are the wires between them, assigned during render and called on a successful create: a quiz
   * that has been saved for real stops being offered back as an unfinished draft, and the
   * redirect to the list isn't stopped by the guard.
   */
  const discardDraftRef = useRef<() => void>(() => {});
  const allowNavigationRef = useRef<() => void>(() => {});

  // This form is mounted under both the admin dashboard (/dashboard/...) and the
  // personal dashboard (/my-dashboard/...). Redirect back into whichever section
  // the user is actually in — a normal user has no access to /dashboard and would
  // otherwise be bounced to a 404 after creating a quiz.
  const dashboardBase = location.pathname.startsWith("/my-dashboard")
    ? "/my-dashboard"
    : "/dashboard";

  /**
   * Which interaction model this builder uses (docs/adr/0026-the-quiz-overview.md). The overview — a reading list
   * with a dialog per question — on a phone, and for AI review on every screen; the three
   * columns only for writing or editing by hand on a screen wide enough for them.
   *
   * A media query in JS rather than CSS because the two layouts mount different things: the
   * quiz fields live in the sidebar in one and in a dialog in the other, and react-hook-form
   * must only ever see one copy of each.
   */
  const isDesktop = useMediaQuery(DESKTOP_QUERY);
  const usesOverview = aiImportMode || !isDesktop;
  // The overview's two dialogs, lifted here so a failed submit can open the one that needs it.
  const [editingQuestionId, setEditingQuestionId] = useState<number | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Question creation mutations
  const createMultipleChoiceMutation = useCreateMultipleChoiceQuestion();
  const createTrueFalseMutation = useCreateTrueFalseQuestion();
  const createTypeTheAnswerMutation = useCreateTypeTheAnswerQuestion();

  const [isCreatingQuestions, setIsCreatingQuestions] = useState(false);

  // Type guards
  const isAnyQuestion = (q: any): q is AnyQuestion => {
    return (
      q && typeof q.id === "number" && "difficulty" in q && "category" in q
    );
  };

  const isNewAnyQuestion = (q: any): q is NewAnyQuestion => {
    return q && !("difficulty" in q) && !("category" in q);
  };

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
        // The work is on the server now, so the local copy has done its job. Cleared through
        // the hook rather than by deleting the key directly: the hook also cancels the write
        // it still has pending, which would otherwise land during the navigation below and
        // resurrect the draft a moment after the quiz was created.
        discardDraftRef.current();
        allowNavigationRef.current();
        onSaved?.();
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
        // This form keeps no draft in AI review mode — the wizard above it does, and this is
        // what tells it the reply has become a real quiz.
        onSaved?.();
        addNotification({
          type: "success",
          title: "Success",
          message: "Your quiz was created successfully!",
        });
        navigate(`${dashboardBase}/quizzes`);
      },
      onError: (error) => {
        // Log only. `/quiz/ai-import`'s failures are authored 4xx messages — "Pick a category
        // for this quiz — its questions inherit it…" — and `parseApiError` already shows them
        // verbatim (docs/development/error-handling.md § "What the toast *says*"). Adding a
        // generic toast on top buried the useful one under "Please try again", which reads as a
        // second, unrelated failure and tells the user nothing about what to do.
        console.error("AI quiz import error:", error);
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

      // Quiz-level classification gate: the client mirror of
      // `QuestionService.ValidateClassificationAsync` and `QuizService.CreateAiQuizAsync`
      // (docs/quiz/quiz-question-classification.md). Every question this submit creates
      // inherits the quiz's category and language, and no question may be *stored* as the
      // seeded "Unspecified" row — so the API rejects the entire save.
      //
      // Not in the zod schema, because the schema only sees an id and `.positive()` is happy
      // with the seeded row's. The rule is matched by name, exactly as both services match it,
      // since seeded ids aren't stable across environments. It stays a mirror and never the
      // rule itself: the API is still the gate.
      //
      // It runs before anything is written, which is the point. On the manual path each new
      // question is its own POST, so an Unspecified category failed every one of them at once
      // (docs/deployment/known-issues.md § quiz-creation atomicity) — a burst of doomed
      // requests to say what one empty dropdown could have said for free.
      //
      // Difficulty is deliberately absent: Unspecified is legal on a question and is what a new
      // one starts from. It blocks *publishing* only, which `canPublish` below already handles.
      const unspecifiedClassification = [
        isUnspecifiedLookup(
          queryData.categories.find((c) => c.id === values.categoryId)?.name,
        )
          ? "category"
          : null,
        isUnspecifiedLookup(
          queryData.languages.find((l) => l.id === values.languageId)?.language,
        )
          ? "language"
          : null,
      ].filter((field): field is string => field !== null);

      if (unspecifiedClassification.length > 0) {
        // These fields live on the Quiz tab (or, in the overview, behind "Edit details"), and
        // the submit button is reachable from elsewhere — same reason `quizTabErrorCount` exists.
        if (usesOverview) setDetailsOpen(true);
        else setActiveTab("quiz");
        addNotification({
          type: "error",
          title:
            unspecifiedClassification.length === 1
              ? `Pick a ${unspecifiedClassification[0]} for this quiz`
              : "Pick a category and language for this quiz",
          message:
            'Its questions inherit them, and "Unspecified" isn\'t allowed on a question.',
        });
        return;
      }

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
          // The overview has no editor on screen until one is opened — open it on the problem.
          if (usesOverview) setEditingQuestionId(firstErrorQuestion.id);
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
                explanation: nq.explanation,
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
                explanation: nq.explanation,
                correctAnswerBoolean: nq.correctAnswer,
              };
            }
            return {
              ...base,
              type: QuestionType.TypeTheAnswer,
              text: nq.text,
              imageUrl: nq.imageUrl,
              explanation: nq.explanation,
              correctAnswerText: nq.correctAnswer,
              acceptableAnswers: nq.acceptableAnswers.map((a) => a.value),
              isCaseSensitive: nq.isCaseSensitive,
              allowPartialMatch: nq.allowPartialMatch,
            };
          },
        );

        try {
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
        } catch {
          // Handled: the interceptor has shown the server's own message. Returning here rather
          // than falling through to the outer catch is deliberate — that handler suppresses
          // itself by reading `createAiQuizMutation.isError`, which is React state set in the
          // same tick and therefore a race. Nothing was written either way: this endpoint is
          // atomic, so there is no half-made quiz to explain.
          return;
        }

        resetAllValidationStates();
        return;
      }

      const processedQuestions = await Promise.all(
        questionsWithSettings.map(async ({ question, settings }, index) => {
          let questionId: number;

          // If question has negative ID, it's a new question that needs to be created.
          // New questions inherit the quiz's category and language (difficulty stays as-is,
          // Unspecified by default) — see inherit-quiz-classification.ts.
          if (question.id < 0) {
            questionId = await createNewQuestion(
              inheritQuizClassification(question as NewAnyQuestion, values),
            );
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

  const formId = isEditMode ? "edit-quiz" : "create-quiz";

  if (queryData.isLoading) {
    return (
      <div className="w-full h-64 flex items-center justify-center">
        {/* The shared Spinner, not a hand-rolled `rounded-full border-b-2` div: that one
            rendered as a 64px circle with a single 2px arc, which reads as a rendering
            glitch rather than a loader, and matched nothing else in the app. */}
        <BlobLoader size="lg" />
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
      id={formId}
      // Only the three-column builder fills the screen; the overview is a page that scrolls,
      // and a fixed height here would end its sticky bar halfway down (docs/RESPONSIVE.md).
      className={usesOverview ? "mt-0 w-full" : "mt-0 w-full lg:h-full"}
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
          : // A new quiz starts Public with instant feedback on — every new quiz, by hand or by
            // AI (stated 2026-10-17; docs/quiz/quiz-visibility.md, "Defaults"). A restored draft
            // or the AI handoff can still say otherwise, so their values win. If a lookup is
            // set to "Unspecified" the publish gate below drops this to Draft, as before.
            {
              status: "Public" as const,
              showFeedbackImmediately: true,
              ...initialValues,
              questions: [],
            },
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

        /**
         * Which of the quiz's three lookups are still the seeded "Unspecified" row.
         *
         * Drives the publication gate: a quiz may be Draft or Unlisted while unclassified, but
         * not Public. Unspecified is invisible to the catalogue's category/difficulty/language
         * facets and to the default "variety" sort, so a public quiz filed under it either can't
         * be found at all or advertises an internal placeholder as a browsable category
         * (docs/quiz/quiz-discovery.md, docs/quiz/filtering.md).
         *
         * Derived from the watched ids rather than stored, so it updates the moment a dropdown
         * changes. `QuizService.EnsurePublishableAsync` is the real gate — this is the affordance
         * that stops the user reaching it.
         */
        const unspecifiedFields = [
          isUnspecifiedLookup(
            queryData.categories.find((c) => c.id === watch("categoryId"))?.name,
          )
            ? "category"
            : null,
          isUnspecifiedLookup(
            queryData.languages.find((l) => l.id === watch("languageId"))
              ?.language,
          )
            ? "language"
            : null,
          isUnspecifiedLookup(
            queryData.difficulties.find((d) => d.id === watch("difficultyId"))
              ?.level,
          )
            ? "difficulty"
            : null,
        ].filter((field): field is string => field !== null);

        const canPublish = unspecifiedFields.length === 0;
        const status = watch("status");

        // Setting a lookup back to Unspecified while Public is selected would otherwise submit a
        // status the server is about to reject. Fall back to Draft, matching `ParseStatus`'s rule
        // that a quiz is never accidentally published — the note under the field explains it.
        useEffect(() => {
          if (!canPublish && status === "Public") setValue("status", "Draft");
        }, [canPublish, status, setValue]);

        // ── Draft persistence (docs/quiz/quiz-draft-persistence.md) ────────────────────
        //
        // `watch()` with no argument subscribes to every field, so this snapshot is rebuilt
        // on each keystroke — which is exactly what the autosave hook wants, since it
        // compares *contents* and not object identity. `questions` is left out on purpose:
        // the form field of that name is bookkeeping written by the Effect above, while the
        // questions worth restoring (with their per-question settings) come from the
        // provider, in the very shape `initialQuestions` takes them back in.
        const formValues = watch();
        const draftCandidate: ManualQuizDraft = {
          form: {
            title: formValues.title,
            description: formValues.description,
            categoryId: formValues.categoryId,
            languageId: formValues.languageId,
            difficultyId: formValues.difficultyId,
            imageUrl: formValues.imageUrl,
            timeLimitInSeconds: formValues.timeLimitInSeconds,
            showFeedbackImmediately: formValues.showFeedbackImmediately,
            status: formValues.status,
            shuffleQuestions: formValues.shuffleQuestions,
          },
          questions: getQuestionsWithSettings(),
        };

        const hasUnsavedWork =
          draftsEnabled && isManualQuizDraftWorthKeeping(draftCandidate);

        const { savedAt: draftSavedAt, discard: discardDraft } =
          useDraftAutosave<ManualQuizDraft>({
            slot: QUIZ_DRAFT_SLOTS.manual,
            userId: user?.id,
            version: QUIZ_DRAFT_VERSION,
            // `enabled`, not a null value: edit mode and AI review share this component and
            // this slot, and a null value would *delete* the manual builder's draft rather
            // than leave it alone. See the hook's `enabled` doc.
            enabled: draftsEnabled,
            value: isManualQuizDraftWorthKeeping(draftCandidate)
              ? draftCandidate
              : null,
          });

        discardDraftRef.current = discardDraft;

        // Leaving with typed work asks first. Armed only while there is something worth
        // keeping, so an untouched builder never prompts; off in edit mode and AI review, which
        // keep no draft here.
        const {
          showLeaveDialog,
          confirmNavigation,
          cancelNavigation,
          allowNavigation,
        } = useNavigationGuard(hasUnsavedWork);
        allowNavigationRef.current = allowNavigation;

        const { errors } = formState;

        // Fields that live on the "Quiz" tab. When the user submits from the
        // "Question" tab these can fail validation off-screen, so we surface the
        // count on the Quiz tab trigger to point them back to the missing fields.
        const quizTabErrorKeys = [
          "title",
          "description",
          "categoryId",
          "difficultyId",
          "languageId",
          "status",
        ] as const;
        const quizTabErrorCount = quizTabErrorKeys.filter(
          (key) => errors[key],
        ).length;

        const isSubmitting =
          createQuizMutation.isPending ||
          updateQuizMutation.isPending ||
          createAiQuizMutation.isPending ||
          isCreatingQuestions;

        // const [imageUrl, setImageUrl] = useState(editQuiz?.imageUrl ?? "");

        // useEffect(() => {
        //   if (imageUrl) {
        //     setValue("imageUrl", imageUrl);
        //   }
        // }, [imageUrl, setValue]);

        // const handleImageUpload = (url: string) => {
        //   setImageUrl(url);
        //   setValue("imageUrl", url);
        // };
        // const handleImageRemove = () => {
        //   setImageUrl("");
        //   setValue("imageUrl", "");
        // };

        /**
         * The primary action says what it will do. "Publish quiz" when the quiz is going out
         * Public — the default for a new quiz — so nobody publishes without the word in front
         * of them; a Draft is saved, not published.
         */
        const submitLabel = isCreatingQuestions
          ? "Creating questions…"
          : isEditMode
            ? "Save changes"
            : status === "Public"
              ? "Publish quiz"
              : status === "Unlisted"
                ? "Save quiz"
                : "Save draft";

        if (usesOverview) {
          return (
            <>
              <LeaveUnfinishedQuizDialog
                isOpen={showLeaveDialog}
                onConfirm={confirmNavigation}
                onCancel={cancelNavigation}
                draftSaved={draftSavedAt !== null}
              />
              <QuizOverview
                flow={aiImportMode ? "ai" : "build"}
                register={register}
                watch={watch}
                setValue={setValue}
                clearErrors={clearErrors}
                errors={errors}
                queryData={queryData}
                canPublish={canPublish}
                unspecifiedFields={unspecifiedFields}
                editingQuestionId={editingQuestionId}
                onEditingQuestionChange={setEditingQuestionId}
                detailsOpen={detailsOpen}
                onDetailsOpenChange={setDetailsOpen}
                submitCount={formState.submitCount}
                formId={formId}
                reviewBack={reviewBack}
                notices={reviewNotices}
                footnote={<DraftSavedIndicator savedAt={draftSavedAt} />}
                submitButton={
                  <LiftedButton
                    type="submit"
                    size="sm"
                    disabled={isSubmitting}
                    className="flex items-center justify-center"
                  >
                    {/* Spinner over an invisible label, so the button keeps its width. The
                        arrow says this is the step forward out of the builder (as Finish's
                        does). Save changes keeps you where you are, so it gets a save icon
                        instead — an arrow would overpromise, and a bare label read as less of
                        a button than "+ Add a question" beside it. */}
                    <span className="relative flex items-center justify-center">
                      <Spinner
                        size="sm"
                        className={isSubmitting ? "absolute visible" : "absolute invisible"}
                      />
                      <span
                        className={
                          isSubmitting
                            ? "invisible flex items-center gap-1.5"
                            : "visible flex items-center gap-1.5"
                        }
                      >
                        {isEditMode && !isCreatingQuestions && (
                          <Save className="h-4 w-4" aria-hidden="true" />
                        )}
                        {submitLabel}
                        {!isEditMode && !isCreatingQuestions && (
                          <ArrowRight className="h-4 w-4" aria-hidden="true" />
                        )}
                      </span>
                    </span>
                  </LiftedButton>
                }
              />
            </>
          );
        }

        return (
          <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-3 lg:h-full lg:min-h-0">
            <LeaveUnfinishedQuizDialog
              isOpen={showLeaveDialog}
              onConfirm={confirmNavigation}
              onCancel={cancelNavigation}
              draftSaved={draftSavedAt !== null}
            />

            {/* Side columns get a 15rem floor. As fifths of the row they were ~180px on a 1024px
                window beside the nav rail — narrower than the 200px selects and the two tabs,
                which overflowed the card (docs/RESPONSIVE.md, "measure the container"). */}
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(15rem,1fr)_minmax(0,3fr)_minmax(15rem,1fr)] gap-3 sm:gap-4 items-start lg:min-h-0 lg:flex-1 lg:overflow-hidden">
              {/* Quiz Details Sidebar */}
              <Card className="md:text-xs lg:text-sm h-fit lg:h-full lg:col-span-1 bg-background border-2 border-primary/30 flex flex-col lg:overflow-hidden">
                <Tabs
                  value={activeTab}
                  onValueChange={setActiveTab}
                  className="flex flex-1 flex-col min-h-0"
                >
                  <CardHeader className="w-full relative bg-primary/10 text-center border-b border-primary/30 px-2 py-3 flex-none">
                    <TabsList className="w-full gap-1.5 border-none bg-none shadow-none rounded-md">
                      <TabsTrigger
                        value="quiz"
                        activeClassName={
                          quizTabErrorCount > 0 ? "bg-red-500" : undefined
                        }
                        className={`min-w-0 rounded-xl px-2 ${
                          quizTabErrorCount > 0
                            ? "ring-2 ring-red-500 ring-offset-1 ring-offset-background data-[state=active]:text-white data-[state=inactive]:bg-red-500/10 data-[state=inactive]:text-red-500 data-[state=inactive]:hover:bg-red-500/15"
                            : ""
                        }`}
                      >
                        <p className="flex min-w-0 items-center gap-1.5 text-sm">
                          <Folder
                            className={`h-4 w-4 ${
                              activeTab === "quiz"
                                ? "text-white"
                                : quizTabErrorCount > 0
                                  ? "text-red-500"
                                  : "text-primary"
                            }`}
                          />
                          Quiz
                          {quizTabErrorCount > 0 && (
                            <span
                              className="ml-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-semibold text-white leading-none group-data-[state=active]:bg-white group-data-[state=active]:text-red-600"
                              aria-label={`${quizTabErrorCount} field${
                                quizTabErrorCount === 1 ? "" : "s"
                              } need attention`}
                            >
                              {quizTabErrorCount}
                            </span>
                          )}
                        </p>
                      </TabsTrigger>
                      <TabsTrigger value="questions" className="min-w-0 rounded-xl px-2">
                        <p className="flex min-w-0 items-center gap-1.5 text-sm">
                          <MessageSquareText
                            className={`h-4 w-4 ${
                              activeTab === "questions"
                                ? "text-white"
                                : "text-primary"
                            }`}
                          />
                          Question
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
                      <QuizDetailsFields
                        register={register}
                        watch={watch}
                        setValue={setValue}
                        clearErrors={clearErrors}
                        errors={errors}
                        queryData={queryData}
                        canPublish={canPublish}
                        unspecifiedFields={unspecifiedFields}
                      />
                    </CardContent>
                  </TabsContent>
                </Tabs>
              </Card>

              {/* Main Quiz Creator Area */}
              <Card className="bg-background border-2 border-primary/30 rounded-xl shadow-lg flex flex-col items-center w-full min-w-0 lg:h-full lg:overflow-hidden">
                <CardHeader className="w-full relative bg-primary/10 p-3 text-center border-b border-primary/30 flex-none">
                  <section className="flex justify-center rounded-lg">
                    <AddQuestionMenu />
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
                  ) : (
                    <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
                      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-dashed border-foreground/20 text-muted-foreground">
                        <Plus className="h-5 w-5" />
                      </div>
                      <p className="text-sm font-medium text-foreground">
                        No questions yet
                      </p>
                      <p className="mt-1 max-w-[16rem] text-xs text-muted-foreground">
                        Use “Add a question” above to browse the pool or create a
                        new one.
                      </p>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="flex-none flex-col gap-1.5 py-3">
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
                        <span
                          className={`flex items-center gap-1.5 ${
                            isSubmitting ? "invisible" : "visible"
                          }`}
                        >
                          {isCreatingQuestions
                            ? "Creating Questions..."
                            : isEditMode
                              ? "Save Changes"
                              : "Finish"}
                          {/* Only on Finish: it's the step forward out of the builder. Save
                              Changes keeps you where you are, so an arrow would overpromise. */}
                          {!isCreatingQuestions && !isEditMode && (
                            <ArrowRight className="h-4 w-4" aria-hidden="true" />
                          )}
                        </span>
                      </div>
                    </LiftedButton>
                  </section>
                  <DraftSavedIndicator savedAt={draftSavedAt} />
                </CardFooter>
              </Card>

              <div className="lg:col-span-1 lg:h-full lg:min-h-0">
                <CreatedQuestionsPanel />
              </div>
            </div>
          </div>
        );
      }}
    </Form>
  );
};

export default CreateQuizForm;
