import { AnyQuestion } from "@/types/ApiTypes";

export interface ExistingSmallQuestionCardProps {
  question: AnyQuestion;
  isActive?: boolean;
  onClick?: () => void;
  onRemove?: () => void;
}

