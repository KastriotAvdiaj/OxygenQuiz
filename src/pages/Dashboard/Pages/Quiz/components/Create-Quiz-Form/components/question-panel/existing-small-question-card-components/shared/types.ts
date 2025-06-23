import { AnyQuestion } from "@/types/ApiTypes";
import { NewAnyQuestion, QuizQuestion } from "../../../../types";

export interface SmallQuestionCardProps {
  question: QuizQuestion;
  isActive?: boolean;
  onClick?: () => void;
  onRemove?: () => void;
}

// Keep these for internal component use if needed
export interface ExistingSmallQuestionCardProps {
  question: AnyQuestion;
  isActive?: boolean;
  onClick?: () => void;
  onRemove?: () => void;
}

export interface NewSmallQuestionCardProps {
  question: NewAnyQuestion;
  isActive?: boolean;
  onClick?: () => void;
  onRemove?: () => void;
}