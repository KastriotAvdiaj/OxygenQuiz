import React, {
  createContext,
  useState,
  useContext,
  ReactNode,
  useCallback,
} from "react";
import {
  DEFAULT_QUESTION_SETTINGS,
  NewAnyQuestion,
  QuestionSettings,
  QuestionSettingsMap,
  QuizQuestion,
} from "./types";
import { z } from "zod";
import { createMultipleChoiceQuestionInputSchema } from "../../../Question/api/Normal-Question/create-multiple-choice-question";
import { createTrueFalseQuestionInputSchema } from "../../../Question/api/True_False-Question/create-true_false-question";
import { createTypeTheAnswerQuestionInputSchema } from "../../../Question/api/Type_The_Answer-Question/create-type-the-answer-question";
import { QuestionType, AnyQuestion } from "@/types/question-types";

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
  removeQuestionFromQuiz: (questionId: number) => void;
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
}

export const QuizQuestionProvider: React.FC<QuizProviderProps> = ({
  children,
}) => {
  // Permanent quiz selections
  const [addedQuestions, setAddedQuestions] = useState<QuizQuestion[]>([]);

  // Display Question
  const [displayQuestion, setDisplayQuestion] = useState<QuizQuestion | null>(
    null
  );

  // Temporary modal selections
  const [tempSelectedQuestions, setTempSelectedQuestions] = useState<
    AnyQuestion[]
  >([]);

  // Modal state
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);

  // Quiz Question Settings State
  const [questionSettings, setQuestionSettings] = useState<QuestionSettingsMap>(
    {}
  );

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
          imageUrl: question.imageUrl,
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
      // Only validate new questions (negative IDs)
      if (question.id < 0) {
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
      if (question.id < 0) {
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
      if (question && question.id < 0) {
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

        return newQuestions;
      }
      return prevSelected;
    });
  };

  const removeQuestionFromQuiz = (questionId: number): void => {
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

      return filtered;
    });
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

      // Validate the updated question if it's a new question (negative ID) AND has been marked as validated
      if (questionId < 0 && validatedQuestions.has(questionId)) {
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
        prevQuestions.map((q) => (q.id === questionId ? updatedQuestion : q))
      );

      if (displayQuestion?.id === questionId) {
        setDisplayQuestion(updatedQuestion);
      }
    },
    [
      displayQuestion,
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

  const contextValue: QuizContextType = {
    // Permanent selections
    addedQuestions,
    addedQuestionsCount: addedQuestions.length,
    addQuestionToQuiz,
    removeQuestionFromQuiz,
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
    <QuizContext.Provider value={contextValue}>{children}</QuizContext.Provider>
  );
};

export const useQuiz = (): QuizContextType => {
  const context = useContext(QuizContext);
  if (context === undefined) {
    throw new Error("useQuiz must be used within a QuizProvider");
  }
  return context;
};
