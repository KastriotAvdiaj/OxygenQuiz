import React from "react";
import { User } from "lucide-react";
import { AnyQuestion } from "@/types/question-types";
import { useIsAdminDashboard } from "@/pages/Dashboard/Pages/Quiz/quiz-paths";

interface QuestionFooterProps {
  question: AnyQuestion;
}

export const QuestionFooter: React.FC<QuestionFooterProps> = ({ question }) => {
  // The id is admin tooling; in the player's builder the author line stands alone.
  const showId = useIsAdminDashboard();
  return (
  <div className="flex justify-between items-center text-xs text-muted-foreground border-t dark:border-foreground/40 pt-3">
    {showId ? <span>ID: {question.id}</span> : <span />}
    <div className="flex items-center gap-1">
      <User size={12} />
      <span>User: {question.user.username}</span>
    </div>
  </div>
  );
};