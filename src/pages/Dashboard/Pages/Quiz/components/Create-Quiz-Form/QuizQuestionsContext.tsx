import { AnyQuestion } from "@/types/ApiTypes";
import React, { createContext, useState, useContext, ReactNode } from "react";

interface QuizContextType {
  selectedQuestions: AnyQuestion[];
  addQuestionToQuiz: (questionObject: AnyQuestion) => void;
  removeQuestionFromQuiz: (questionId: number) => void;
  isQuestionSelected: (questionId: number) => boolean;
}

const QuizContext = createContext<QuizContextType | undefined>(undefined);

interface QuizProviderProps {
  children: ReactNode;
}

export const QuizQuestionProvider: React.FC<QuizProviderProps> = ({ children }) => {
  const [selectedQuestions, setSelectedQuestions] = useState<AnyQuestion[]>([]);

  const addQuestionToQuiz = (questionObject: AnyQuestion): void => {
    setSelectedQuestions((prevSelected) => {
      if (!prevSelected.find((q) => q.id === questionObject.id)) {
        return [...prevSelected, questionObject];
      }
      return prevSelected;
    });
  };

  const removeQuestionFromQuiz = (questionId: number): void => {
    setSelectedQuestions((prevSelected) =>
      prevSelected.filter((q) => q.id !== questionId)
    );
  };

  const isQuestionSelected = (questionId: number): boolean => {
    return selectedQuestions.some((q) => q.id === questionId);
  };

  const contextValue: QuizContextType = {
    selectedQuestions,
    addQuestionToQuiz,
    removeQuestionFromQuiz,
    isQuestionSelected,
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
