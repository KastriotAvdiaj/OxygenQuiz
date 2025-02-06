import { AnswerOption } from "@/types/ApiTypes";
import React from "react";

interface AnswerOptionViewListProps {
  answerOptions: AnswerOption[];
}

export const AnswerOptionViewList: React.FC<AnswerOptionViewListProps> = ({
  answerOptions,
}) => {
  return (
    <ul className="space-y-2">
      {answerOptions.map((option) => (
        <li
          key={option.id}
          className={`p-2 rounded ${
            option.isCorrect
              ? "bg-green-100 dark:bg-green-900"
              : "bg-muted"
          }`}
        >
          {option.text}
          {option.isCorrect && (
            <span className="ml-2 text-green-600 dark:text-green-400">
              (Correct)
            </span>
          )}
        </li>
      ))}
    </ul>
  );
};
