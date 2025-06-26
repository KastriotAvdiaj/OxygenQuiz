import React from "react";
import { User } from "lucide-react";
import { AnyQuestion } from "@/types/question-types";

interface QuestionFooterProps {
  question: AnyQuestion;
}

export const QuestionFooter: React.FC<QuestionFooterProps> = ({ question }) => (
  <div className="flex justify-between items-center text-xs text-muted-foreground border-t dark:border-foreground/40 pt-3">
    <span>ID: {question.id}</span>
    <div className="flex items-center gap-1">
      <User size={12} />
      <span>User: {question.user.username}</span>
    </div>
  </div>
);