import React from "react";
import { AnyQuestion } from "@/types/ApiTypes";
import { CommonSelectQuestionCard } from "./select-common-question-card";

interface QuestionListProps {
  questions: AnyQuestion[];
}

export const QuestionListComponent: React.FC<QuestionListProps> = ({
  questions,
}) => {
  if (!questions || questions.length === 0) {
    return <p>No questions to display.</p>;
  }

  return (
    <div>
      {questions.map((question) => (
        <CommonSelectQuestionCard key={question.id} question={question} />
      ))}
    </div>
  );
};
