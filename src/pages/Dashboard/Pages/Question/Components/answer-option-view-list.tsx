import { AnswerOption } from "@/types/ApiTypes";
import React from "react";

interface AnswerOptionViewListProps {
  answerOptions: AnswerOption[];
}

export const AnswerOptionViewList: React.FC<AnswerOptionViewListProps> = ({ answerOptions }) => {
  // Use a grid layout if there are 2, 3, or 4 options.
  const gridClass =
    answerOptions.length === 2 || answerOptions.length === 4 || answerOptions.length === 3
      ? "grid grid-cols-2 gap-2"
      : "flex flex-col space-y-2";

  return (
    <ul className={gridClass}>
      {answerOptions.map((option, index) => {
        // For 3 options, make the last one span both columns.
        const extraClasses = answerOptions.length === 3 && index === 2 ? "col-span-2" : "";
        return (
          <li
            key={option.id}
            className={`p-2 rounded ${
              option.isCorrect ? "bg-green-100 dark:bg-green-900" : "bg-muted"
            } ${extraClasses}`}
          >
            {option.text}
            {option.isCorrect && (
              <span className="ml-2 text-green-600 dark:text-green-400">(Correct)</span>
            )}
          </li>
        );
      })}
    </ul>
  );
};
