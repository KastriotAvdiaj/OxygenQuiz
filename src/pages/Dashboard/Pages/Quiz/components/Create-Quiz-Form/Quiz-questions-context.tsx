import React, {
  createContext,
  useState,
  useContext,
  ReactNode,
  useCallback,
  useRef,
} from "react";
import {
  DEFAULT_QUESTION_SETTINGS,
  NewAnyQuestion,
  QuestionSettings,
  QuestionSettingsMap,
  QuizQuestion,
} from "./types";
import { z } from "zod";
import { createMultipleChoiceQuestionInputSchema } from "../../../Question/api/Multiple_Choice_Question/create-multiple-choice-question";
import { createTrueFalseQuestionInputSchema } from "../../../Question/api/True_False-Question/create-true_false-question";
import { createTypeTheAnswerQuestionInputSchema } from "../../../Question/api/Type_The_Answer-Question/create-type-the-answer-question";
import { QuestionType, AnyQuestion } from "@/types/question-types";
import {
  peekRemoval,
  popRemoval,
  pushRemoval,
  reinsert,
  type RemovedQuestion,
} from "./question-history";
import { isDraftShape, isSavedShape, toEditableCopy, toInPlaceDraft } from "./edit-copy";
import {
  useQuestionEditability,
  type QuestionEditability,
} from "../../../Question/api/get-question-editability";
import { useSettingsData } from "@/pages/UserRelated/SettingsPage/api/get-settings";
import { useUpdateSettings } from "@/pages/UserRelated/SettingsPage/api/update-settings";
import { useNotifications } from "@/common/Notifications";
import { EditCopyDialog, RemoveQuestionDialog } from "./components/question-action-dialogs";

// Validation error type
export interface ValidationError {
  field: string;
  message: string;
}

export interface QuestionValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

interface QuizContextType {
  // Permanent quiz selections
  addedQuestions: QuizQuestion[];
  addedQuestionsCount: number;
  addQuestionToQuiz: (questionObject: QuizQuestion) => void;
  /**
   * Removes at once, no questions asked, and records the removal for Undo. UI should call
   * `requestRemoveQuestion` instead, which confirms first.
   */
  removeQuestionFromQuiz: (questionId: number) => void;
  /**
   * Ask "Remove question N?" and remove on confirm. `onRemoved` runs only if it was removed —
   * the overview's editor uses it to move on to the next question.
   */
  requestRemoveQuestion: (questionId: number, onRemoved?: () => void) => void;
  /** The removal Undo would reverse next (newest first), or null. */
  lastRemoval: RemovedQuestion | null;
  /** How many removals Undo can still walk back. */
  removalCount: number;
  /** Put the most recently removed question back where it was. */
  undoLastRemoval: () => void;
  /**
   * Ask "Edit question N for this quiz?" about a saved question and, on confirm, swap it for an
   * editable draft copy at the same position (edit-copy.ts). `onCopied` gets the copy's id.
   */
  requestEditCopy: (questionId: number, onCopied?: (copyId: number) => void) => void;
  /**
   * Whether a saved question may be edited in place (QuestionEditRule on the server): undefined
   * while it's being asked, and for drafts. See edit-copy.ts.
   */
  editabilityOf: (questionId: number) => QuestionEditability | undefined;
  /**
   * The question as it was before it was edited in place, for a saved question that is now
   * draft-shaped — saving compares against it and skips an unchanged one. Undefined if unknown
   * (e.g. restored from a stored draft), in which case saving updates it.
   */
  getInPlaceOriginal: (questionId: number) => NewAnyQuestion | undefined;
  /**
   * Replace the order of the quiz's questions. Takes the whole reordered list — the shape
   * framer-motion's `Reorder.Group` hands back — and must contain the same questions.
   * Order is positional: `getQuestionsWithSettings` derives `orderInQuiz` from the index.
   */
  reorderQuestions: (ordered: QuizQuestion[]) => void;
  isQuestionSelected: (questionId: number) => boolean;

  // Temporary modal selections
  tempSelectedQuestions: AnyQuestion[];
  tempSelectedQuestionsCount: number;
  addToTempSelection: (questionObject: AnyQuestion) => void;
  removeFromTempSelection: (questionId: number) => void;
  isTempSelected: (questionId: number) => boolean;
  clearTempSelection: () => void;
  commitTempSelection: () => void;

  // Display Question
  displayQuestion: QuizQuestion | null;
  setDisplayQuestion: (question: QuizQuestion | null) => void;

  // Modal state
  isQuestionModalOpen: boolean;
  setQuestionModalOpen: (open: boolean) => void;

  // Quiz Question Settings Management
  questionSettings: QuestionSettingsMap;
  updateQuestionSetting: (
    questionId: number,
    key: keyof QuestionSettings,
    value: any
  ) => void;
  getQuestionSettings: (questionId: number) => QuestionSettings;
  bulkUpdateSettings: (updates: Partial<QuestionSettings>) => void;
  copySettingsToQuestion: (
    fromQuestionId: number,
    toQuestionId: number
  ) => void;
  resetQuestionSettings: (questionId: number) => void;
  getQuestionsWithSettings: () => Array<{
    question: QuizQuestion;
    settings: QuestionSettings;
  }>;
  activeTab: string;
  setActiveTab: (tab: string) => void;

  // Function to update ("NEW") questions
  updateQuestion: (questionId: number, updatedQuestion: QuizQuestion) => void;

  // Validation functions
  validateQuestion: (question: NewAnyQuestion) => QuestionValidationResult;
  validateAllQuestions: () => Map<number, QuestionValidationResult>;
  getQuestionErrors: (questionId: number) => ValidationError[];

  // NEW: Improved validation state management
  validateAllQuestionsForSubmit: () => boolean;
  markQuestionAsValidated: (questionId: number) => void;
  resetAllValidationStates: () => void;

  // Question errors state
  questionErrors: Map<number, ValidationError[]>;
  setQuestionErrors: (questionId: number, errors: ValidationError[]) => void;
  clearQuestionErrors: (questionId: number) => void;
}

const QuizContext = createContext<QuizContextType | undefined>(undefined);

interface QuizProviderProps {
  children: ReactNode;
  /**
   * Edit mode: the quiz's existing questions and their per-question settings
   * (time limit / point system / order), used to seed the form's state.
   */
  initialQuestions?: Array<{
    question: QuizQuestion;
    settings: QuestionSettings;
  }>;
  /** The quiz being edited — "another quiz" for the edit rule means any but this one. */
  quizId?: number;
}

export const QuizQuestionProvider: React.FC<QuizProviderProps> = ({
  children,
  initialQuestions,
  quizId,
}) => {
  // Permanent quiz selections (seeded from the existing quiz in edit mode)
  const [addedQuestions, setAddedQuestions] = useState<QuizQuestion[]>(
    () => initialQuestions?.map(({ question }) => question) ?? []
  );

  // Display Question (edit mode opens on the quiz's first question)
  const [displayQuestion, setDisplayQuestion] = useState<QuizQuestion | null>(
    () => initialQuestions?.[0]?.question ?? null
  );

  // Temporary modal selections
  const [tempSelectedQuestions, setTempSelectedQuestions] = useState<
    AnyQuestion[]
  >([]);

  // Modal state
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);

  // Quiz Question Settings State (seeded from the existing quiz in edit mode)
  const [questionSettings, setQuestionSettings] = useState<QuestionSettingsMap>(
    () =>
      Object.fromEntries(
        (initialQuestions ?? []).map(({ question, settings }) => [
          question.id,
          settings,
        ])
      )
  );
  const [activeTab, setActiveTab] = useState<string>("quiz");

  // ── Undo for removals (question-history.ts) and the two confirmations ──────────────────
  // The stack lives exactly as long as this provider: the builder remounts it on save
  // (edit-quiz keys it by quiz version) and on leaving, which is when Undo stops making sense.
  const [removedStack, setRemovedStack] = useState<RemovedQuestion[]>([]);
  const [pendingRemovalId, setPendingRemovalId] = useState<number | null>(null);
  const [pendingCopyId, setPendingCopyId] = useState<number | null>(null);
  // In-place edits' originals (see updateQuestion). A ref: read only when saving.
  const inPlaceOriginals = useRef(new Map<number, NewAnyQuestion>());

  // Which saved questions may be edited in place — asked of the server, which also enforces it.
  const savedIds = addedQuestions.filter((q) => q.id > 0).map((q) => q.id);
  const editability = useQuestionEditability(savedIds, quizId ?? null);
  // If the check fails (or the API predates it), a saved question falls back to the safe path:
  // read-only with "Edit for this quiz" — never stuck on "Checking…" with no way to edit.
  const editabilityOf = (questionId: number): QuestionEditability | undefined =>
    editability.data?.find((e) => e.questionId === questionId) ??
    (editability.isError
      ? { questionId, canEditInPlace: false, reason: null, otherQuizCount: 0, pickedQuizCount: 0 }
      : undefined);

  // "Ask before removing a question" — Settings › Quiz, or the dialog's "Don't ask again".
  // Asks until the setting has loaded and says otherwise.
  const settings = useSettingsData();
  const updateSettings = useUpdateSettings();
  const { addNotification } = useNotifications();
  const askBeforeRemoving = settings.data?.askBeforeRemovingQuestion ?? true;

  // Callbacks for the pending confirmation. Refs, not state: they are never rendered.
  const afterRemoval = useRef<(() => void) | undefined>(undefined);
  const afterCopy = useRef<((copyId: number) => void) | undefined>(undefined);

  // NEW: Track which questions have been validated (per-question validation state)
  const [validatedQuestions, setValidatedQuestions] = useState<Set<number>>(
    new Set()
  );

  // Question errors state
  const [questionErrors, setQuestionErrorsState] = useState<
    Map<number, ValidationError[]>
  >(new Map());

  // Helper function to get the appropriate schema based on question type
  const getValidationSchema = (questionType: QuestionType) => {
    switch (questionType) {
      case QuestionType.MultipleChoice:
        return createMultipleChoiceQuestionInputSchema;
      case QuestionType.TrueFalse:
        return createTrueFalseQuestionInputSchema;
      case QuestionType.TypeTheAnswer:
        return createTypeTheAnswerQuestionInputSchema;
      default:
        throw new Error(`Unknown question type: ${questionType}`);
    }
  };

  // Validation functions
  const validateQuestion = useCallback(
    (question: NewAnyQuestion): QuestionValidationResult => {
      try {
        const schema = getValidationSchema(question.type);

        // Transform question to match API schema format

        console.log("Validating question:", question);
        const questionData = {
          text: question.text,
          difficultyId: question.difficultyId,
          categoryId: question.categoryId,
          languageId: question.languageId,
          mediaAssetId: question.media?.assetId ?? null,
          explanation: question.explanation,
          visibility: question.visibility,
          ...(question.type === QuestionType.MultipleChoice && {
            answerOptions: (question as any).answerOptions,
            allowMultipleSelections: (question as any).allowMultipleSelections,
          }),
          ...(question.type === QuestionType.TrueFalse && {
            correctAnswer: (question as any).correctAnswer,
          }),
          ...(question.type === QuestionType.TypeTheAnswer && {
            correctAnswer: (question as any).correctAnswer,
            isCaseSensitive: (question as any).isCaseSensitive,
            allowPartialMatch: (question as any).allowPartialMatch,
            acceptableAnswers: (question as any).acceptableAnswers,
          }),
        };

        schema.parse(questionData);
        return { isValid: true, errors: [] };
      } catch (error) {
        if (error instanceof z.ZodError) {
          const validationErrors: ValidationError[] = error.errors.map(
            (err) => ({
              field: err.path.join("."),
              message: err.message,
            })
          );
          return { isValid: false, errors: validationErrors };
        }
        return {
          isValid: false,
          errors: [{ field: "general", message: "Unknown validation error" }],
        };
      }
    },
    []
  );

  const validateAllQuestions = useCallback((): Map<
    number,
    QuestionValidationResult
  > => {
    const results = new Map<number, QuestionValidationResult>();

    addedQuestions.forEach((question) => {
      // Only drafts are validated — written here, copied, or a saved one edited in place.
      if (isDraftShape(question)) {
        const result = validateQuestion(question as NewAnyQuestion);
        results.set(question.id, result);

        // Only update errors state if this specific question has been validated
        if (validatedQuestions.has(question.id)) {
          if (!result.isValid) {
            setQuestionErrorsState(
              (prev) => new Map(prev.set(question.id, result.errors))
            );
          } else {
            setQuestionErrorsState((prev) => {
              const newMap = new Map(prev);
              newMap.delete(question.id);
              return newMap;
            });
          }
        }
      }
    });

    return results;
  }, [addedQuestions, validateQuestion, validatedQuestions]);

  // NEW: Function to validate all questions for submit (marks all as validated)
  const validateAllQuestionsForSubmit = useCallback((): boolean => {
    const newValidatedQuestions = new Set<number>();
    let hasErrors = false;

    addedQuestions.forEach((question) => {
      if (isDraftShape(question)) {
        newValidatedQuestions.add(question.id);
        const result = validateQuestion(question as NewAnyQuestion);

        if (!result.isValid) {
          hasErrors = true;
          setQuestionErrorsState(
            (prev) => new Map(prev.set(question.id, result.errors))
          );
        } else {
          setQuestionErrorsState((prev) => {
            const newMap = new Map(prev);
            newMap.delete(question.id);
            return newMap;
          });
        }
      }
    });

    setValidatedQuestions(newValidatedQuestions);
    return !hasErrors;
  }, [addedQuestions, validateQuestion]);

  // NEW: Function to mark a specific question as validated
  const markQuestionAsValidated = useCallback(
    (questionId: number) => {
      setValidatedQuestions((prev) => new Set(prev).add(questionId));

      // Run validation for this specific question
      const question = addedQuestions.find((q) => q.id === questionId);
      if (question && isDraftShape(question)) {
        const result = validateQuestion(question as NewAnyQuestion);
        if (!result.isValid) {
          setQuestionErrorsState(
            (prev) => new Map(prev.set(questionId, result.errors))
          );
        } else {
          setQuestionErrorsState((prev) => {
            const newMap = new Map(prev);
            newMap.delete(questionId);
            return newMap;
          });
        }
      }
    },
    [addedQuestions, validateQuestion]
  );

  // NEW: Function to reset all validation states
  const resetAllValidationStates = useCallback(() => {
    setValidatedQuestions(new Set());
    setQuestionErrorsState(new Map());
  }, []);

  const getQuestionErrors = useCallback(
    (questionId: number): ValidationError[] => {
      // Only return errors if this specific question has been validated
      if (!validatedQuestions.has(questionId)) {
        return [];
      }
      return questionErrors.get(questionId) || [];
    },
    [questionErrors, validatedQuestions]
  );

  const setQuestionErrors = useCallback(
    (questionId: number, errors: ValidationError[]) => {
      // Only set errors if this specific question has been validated
      if (validatedQuestions.has(questionId)) {
        setQuestionErrorsState((prev) => new Map(prev.set(questionId, errors)));
      }
    },
    [validatedQuestions]
  );

  const clearQuestionErrors = useCallback((questionId: number) => {
    setQuestionErrorsState((prev) => {
      const newMap = new Map(prev);
      newMap.delete(questionId);
      return newMap;
    });
  }, []);

  // Permanent quiz selection functions
  const addQuestionToQuiz = (questionObject: QuizQuestion): void => {
    setAddedQuestions((prevSelected) => {
      if (!prevSelected.find((q) => q.id === questionObject.id)) {
        const newQuestions = [...prevSelected, questionObject];
        setDisplayQuestion(questionObject);
        // Initialize settings for new question if not exists
        if (!questionSettings[questionObject.id]) {
          setQuestionSettings((prev) => ({
            ...prev,
            [questionObject.id]: {
              ...DEFAULT_QUESTION_SETTINGS,
              orderInQuiz: newQuestions.length - 1,
            },
          }));
        }
        setActiveTab("questions");
        return newQuestions;
      }
      return prevSelected;
    });
  };

  const removeQuestionFromQuiz = (questionId: number): void => {
    const index = addedQuestions.findIndex((q) => q.id === questionId);
    if (index >= 0) {
      setRemovedStack((prev) =>
        pushRemoval(prev, {
          question: addedQuestions[index],
          settings: {
            ...DEFAULT_QUESTION_SETTINGS,
            ...questionSettings[questionId],
            orderInQuiz: index,
          },
          index,
        })
      );
    }
    setAddedQuestions((prevSelected) => {
      const filtered = prevSelected.filter((q) => q.id !== questionId);
      if (displayQuestion?.id === questionId) {
        setDisplayQuestion(filtered[0] || null);
      }

      // Clear errors and validation state for removed question
      clearQuestionErrors(questionId);
      setValidatedQuestions((prev) => {
        const newSet = new Set(prev);
        newSet.delete(questionId);
        return newSet;
      });

      // Update order indices after removal
      setQuestionSettings((prev) => {
        const newSettings = { ...prev };
        delete newSettings[questionId];

        filtered.forEach((question, index) => {
          if (newSettings[question.id]) {
            newSettings[question.id] = {
              ...newSettings[question.id],
              orderInQuiz: index,
            };
          }
        });

        return newSettings;
      });
      if (filtered.length === 0) {
        setActiveTab("quiz");
      }
      return filtered;
    });
  };

  const requestRemoveQuestion = (questionId: number, onRemoved?: () => void): void => {
    if (!askBeforeRemoving) {
      removeQuestionFromQuiz(questionId);
      onRemoved?.();
      return;
    }
    afterRemoval.current = onRemoved;
    setPendingRemovalId(questionId);
  };

  const confirmRemoval = (dontAskAgain: boolean): void => {
    if (pendingRemovalId !== null) {
      removeQuestionFromQuiz(pendingRemovalId);
      afterRemoval.current?.();
    }
    afterRemoval.current = undefined;
    setPendingRemovalId(null);
    if (dontAskAgain && settings.data) {
      updateSettings.mutate(
        { ...settings.data, askBeforeRemovingQuestion: false },
        {
          onSuccess: () =>
            addNotification({
              type: "info",
              title: "Won't ask again",
              message: "Turn it back on in Settings › Quiz.",
            }),
        },
      );
    }
  };

  const undoLastRemoval = (): void => {
    const entry = peekRemoval(removedStack);
    if (!entry) return;
    setRemovedStack(popRemoval(removedStack));
    setAddedQuestions((prev) => reinsert(prev, entry));
    setQuestionSettings((prev) => ({ ...prev, [entry.question.id]: entry.settings }));
    // Show what came back, so the restore is visible rather than somewhere down the list.
    setDisplayQuestion(entry.question);
    setActiveTab("questions");
  };

  const requestEditCopy = (questionId: number, onCopied?: (copyId: number) => void): void => {
    afterCopy.current = onCopied;
    setPendingCopyId(questionId);
  };

  const confirmEditCopy = (): void => {
    const original = addedQuestions.find((q) => q.id === pendingCopyId);
    if (original && isSavedShape(original)) {
      const copy = toEditableCopy(original, -Date.now());
      setAddedQuestions((prev) => prev.map((q) => (q.id === original.id ? copy : q)));
      // Same points and time limit, now keyed by the copy.
      setQuestionSettings((prev) => {
        const { [original.id]: settings, ...rest } = prev;
        return { ...rest, [copy.id]: { ...DEFAULT_QUESTION_SETTINGS, ...settings } };
      });
      setDisplayQuestion(copy);
      afterCopy.current?.(copy.id);
    }
    afterCopy.current = undefined;
    setPendingCopyId(null);
  };

  const reorderQuestions = (ordered: QuizQuestion[]): void => {
    setAddedQuestions(ordered);
  };

  const isQuestionSelected = (questionId: number): boolean => {
    return addedQuestions.some((q) => q.id === questionId);
  };

  // Temporary selection functions
  const addToTempSelection = (questionObject: AnyQuestion): void => {
    setTempSelectedQuestions((prevSelected) => {
      if (!prevSelected.find((q) => q.id === questionObject.id)) {
        return [...prevSelected, questionObject];
      }
      return prevSelected;
    });
  };

  const removeFromTempSelection = (questionId: number): void => {
    setTempSelectedQuestions((prevSelected) =>
      prevSelected.filter((q) => q.id !== questionId)
    );
  };

  const isTempSelected = (questionId: number): boolean => {
    return tempSelectedQuestions.some((q) => q.id === questionId);
  };

  const clearTempSelection = (): void => {
    setTempSelectedQuestions([]);
  };

  const commitTempSelection = (): void => {
    setActiveTab("questions");
    setAddedQuestions((prevSelected) => {
      setDisplayQuestion(tempSelectedQuestions[0]);
      const newQuestions = tempSelectedQuestions.filter(
        (tempQ) => !prevSelected.find((q) => q.id === tempQ.id)
      );

      const currentLength = prevSelected.length;
      newQuestions.forEach((question, index) => {
        setQuestionSettings((prev) => ({
          ...prev,
          [question.id]: {
            ...DEFAULT_QUESTION_SETTINGS,
            orderInQuiz: currentLength + index,
          },
        }));
      });

      return [...prevSelected, ...newQuestions];
    });
    setTempSelectedQuestions([]);
  };

  const setQuestionModalOpen = (open: boolean): void => {
    setIsQuestionModalOpen(open);
    if (!open) {
      setTempSelectedQuestions([]);
    }
  };

  // Method for updating "NEW" question with validation
  const updateQuestion = useCallback(
    (questionId: number, updatedQuestion: QuizQuestion): void => {
      console.log("🔄 updateQuestion called for:", questionId);

      // Validate a draft once it has been marked as validated (a submit was attempted).
      if (isDraftShape(updatedQuestion) && validatedQuestions.has(questionId)) {
        const validationResult = validateQuestion(
          updatedQuestion as NewAnyQuestion
        );
        if (!validationResult.isValid) {
          setQuestionErrors(questionId, validationResult.errors);
        } else {
          clearQuestionErrors(questionId);
        }
      }

      setAddedQuestions((prevQuestions) =>
        prevQuestions.map((q) => {
          if (q.id !== questionId) return q;
          // A saved question's first edit in place: remember how it was, so saving can tell
          // "opened" from "changed" (the editors write back as soon as they mount).
          if (isSavedShape(q) && isDraftShape(updatedQuestion) && !inPlaceOriginals.current.has(q.id)) {
            inPlaceOriginals.current.set(q.id, toInPlaceDraft(q));
          }
          return updatedQuestion;
        })
      );

      setDisplayQuestion((prev) =>
        prev?.id === questionId ? updatedQuestion : prev
      );
    },
    [
      // displayQuestion,
      validateQuestion,
      setQuestionErrors,
      clearQuestionErrors,
      validatedQuestions,
    ]
  );

  // Question Settings Functions (unchanged)
  const updateQuestionSetting = useCallback(
    (questionId: number, key: keyof QuestionSettings, value: any) => {
      setQuestionSettings((prev) => ({
        ...prev,
        [questionId]: {
          ...prev[questionId],
          [key]: value,
        },
      }));
    },
    []
  );

  const getQuestionSettings = useCallback(
    (questionId: number): QuestionSettings => {
      const settings = questionSettings[questionId];
      const orderInQuiz = addedQuestions.findIndex((q) => q.id === questionId);

      return {
        ...DEFAULT_QUESTION_SETTINGS,
        ...settings,
        orderInQuiz:
          orderInQuiz >= 0 ? orderInQuiz : settings?.orderInQuiz || 0,
      };
    },
    [questionSettings, addedQuestions]
  );

  const bulkUpdateSettings = useCallback(
    (updates: Partial<QuestionSettings>) => {
      setQuestionSettings((prev) => {
        const newSettings = { ...prev };
        addedQuestions.forEach((question) => {
          newSettings[question.id] = {
            ...newSettings[question.id],
            ...updates,
          };
        });
        return newSettings;
      });
    },
    [addedQuestions]
  );

  const copySettingsToQuestion = useCallback(
    (fromQuestionId: number, toQuestionId: number) => {
      const sourceSettings = questionSettings[fromQuestionId];
      if (sourceSettings) {
        setQuestionSettings((prev) => ({
          ...prev,
          [toQuestionId]: {
            ...sourceSettings,
            orderInQuiz: prev[toQuestionId]?.orderInQuiz || 0,
          },
        }));
      }
    },
    [questionSettings]
  );

  const resetQuestionSettings = useCallback((questionId: number) => {
    setQuestionSettings((prev) => ({
      ...prev,
      [questionId]: {
        ...DEFAULT_QUESTION_SETTINGS,
        orderInQuiz: prev[questionId]?.orderInQuiz || 0,
      },
    }));
  }, []);

  const getQuestionsWithSettings = useCallback(() => {
    return addedQuestions.map((question, index) => ({
      question,
      settings: {
        ...DEFAULT_QUESTION_SETTINGS,
        ...questionSettings[question.id],
        orderInQuiz: index,
      },
    }));
  }, [addedQuestions, questionSettings]);

  const positionOf = (id: number | null) => {
    const i = id === null ? -1 : addedQuestions.findIndex((q) => q.id === id);
    return i >= 0 ? i + 1 : null;
  };
  const pendingRemovalNumber = positionOf(pendingRemovalId);
  const pendingCopyNumber = positionOf(pendingCopyId);

  const contextValue: QuizContextType = {
    // Permanent selections
    addedQuestions,
    addedQuestionsCount: addedQuestions.length,
    addQuestionToQuiz,
    removeQuestionFromQuiz,
    requestRemoveQuestion,
    lastRemoval: peekRemoval(removedStack),
    removalCount: removedStack.length,
    undoLastRemoval,
    requestEditCopy,
    editabilityOf,
    getInPlaceOriginal: (questionId: number) => inPlaceOriginals.current.get(questionId),
    reorderQuestions,
    isQuestionSelected,

    // Temporary selections
    tempSelectedQuestions,
    tempSelectedQuestionsCount: tempSelectedQuestions.length,
    addToTempSelection,
    removeFromTempSelection,
    isTempSelected,
    clearTempSelection,
    commitTempSelection,

    // Display Question
    displayQuestion,
    setDisplayQuestion,

    // Modal state
    isQuestionModalOpen,
    setQuestionModalOpen,

    // Quiz Question Settings
    questionSettings,
    updateQuestionSetting,
    getQuestionSettings,
    bulkUpdateSettings,
    copySettingsToQuestion,
    resetQuestionSettings,
    getQuestionsWithSettings,
    activeTab,
    setActiveTab,

    // Method for updating "NEW" question
    updateQuestion,

    // Validation
    validateQuestion,
    validateAllQuestions,
    getQuestionErrors,

    // NEW: Improved validation state management
    validateAllQuestionsForSubmit,
    markQuestionAsValidated,
    resetAllValidationStates,

    questionErrors,
    setQuestionErrors,
    clearQuestionErrors,
  };

  return (
    <QuizContext.Provider value={contextValue}>
      {children}
      <RemoveQuestionDialog
        number={pendingRemovalNumber}
        isDraft={pendingRemovalId !== null && pendingRemovalId < 0}
        onConfirm={confirmRemoval}
        onCancel={() => {
          afterRemoval.current = undefined;
          setPendingRemovalId(null);
        }}
      />
      <EditCopyDialog
        number={pendingCopyNumber}
        onConfirm={confirmEditCopy}
        onCancel={() => {
          afterCopy.current = undefined;
          setPendingCopyId(null);
        }}
      />
    </QuizContext.Provider>
  );
};

export const useQuiz = (): QuizContextType => {
  const context = useContext(QuizContext);
  if (context === undefined) {
    throw new Error("useQuiz must be used within a QuizProvider");
  }
  return context;
};
