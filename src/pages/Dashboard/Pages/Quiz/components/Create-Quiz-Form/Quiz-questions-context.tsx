import { AnyQuestion } from "@/types/ApiTypes";
import React, {
  createContext,
  useState,
  useContext,
  ReactNode,
  useCallback,
} from "react";
import {
  DEFAULT_QUESTION_SETTINGS,
  QuestionSettings,
  QuestionSettingsMap,
} from "./types";

interface QuizContextType {
  // Permanent quiz selections
  addedQuestions: AnyQuestion[];
  addedQuestionsCount: number;
  addQuestionToQuiz: (questionObject: AnyQuestion) => void;
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
  displayQuestion: AnyQuestion | null;
  setDisplayQuestion: (question: AnyQuestion | null) => void;

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
    question: AnyQuestion;
    settings: QuestionSettings;
  }>;
}

const QuizContext = createContext<QuizContextType | undefined>(undefined);

interface QuizProviderProps {
  children: ReactNode;
}

export const QuizQuestionProvider: React.FC<QuizProviderProps> = ({
  children,
}) => {
  // Permanent quiz selections
  const [addedQuestions, setAddedQuestions] = useState<AnyQuestion[]>([]);

  // Display Question
  const [displayQuestion, setDisplayQuestion] = useState<AnyQuestion | null>(
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

  // Permanent quiz selection functions
  const addQuestionToQuiz = (questionObject: AnyQuestion): void => {
    setAddedQuestions((prevSelected) => {
      if (!prevSelected.find((q) => q.id === questionObject.id)) {
        const newQuestions = [...prevSelected, questionObject];

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

      // Update order indices after removal
      setQuestionSettings((prev) => {
        const newSettings = { ...prev };
        delete newSettings[questionId]; // Remove settings for deleted question

        // Reorder remaining questions
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

      // Initialize settings for new questions
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

  // NEW: Question Settings Functions
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
      const orderInQuiz = addedQuestions.findIndex(
        (q) => q.id === questionId
      );

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
            orderInQuiz: prev[toQuestionId]?.orderInQuiz || 0, // Preserve order
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
        orderInQuiz: prev[questionId]?.orderInQuiz || 0, // Preserve order
      },
    }));
  }, []);

  const getQuestionsWithSettings = useCallback(() => {
    return addedQuestions.map((question, index) => ({
      question,
      settings: {
        ...DEFAULT_QUESTION_SETTINGS,
        ...questionSettings[question.id],
        orderInQuiz: index, // Always use current array position
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
