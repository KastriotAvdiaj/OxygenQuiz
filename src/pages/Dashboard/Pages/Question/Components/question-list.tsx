import React from "react";
import { Question } from "@/types/ApiTypes";
import { FolderMinus } from "lucide-react";
import { NormalQuestionCard } from "./normal-question-card";
import { Button } from "@/components/ui";

interface QuestionListProps {
  questions: Question[];
  onNextPage?: () => void;
  onPreviousPage?: () => void;
  currentPage: number;
  totalPages: number;
}

export const QuestionList: React.FC<QuestionListProps> = ({
  questions,
  onNextPage,
  onPreviousPage,
  currentPage,
  totalPages,
}) => {
  if (questions.length === 0) {
    return (
      <div className="col-span-full flex flex-col items-center justify-center text-center p-12 rounded-lg">
        <FolderMinus size={48} className="mb-4" />
        <p className="text-xl font-semibold">No questions found.</p>
        <p className="text-sm mt-2">
          Try adjusting your search or filter to find what you're looking for.
        </p>
      </div>
    );
  }

  return (
    <div className="h-fit overflow-auto p-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {questions.map((question) => (
          <div key={question.id} className="w-full">
            <NormalQuestionCard question={question} />
          </div>
        ))}
      </div>

      <div className="flex justify-end items-center mt-6 gap-5">
        <Button
          onClick={onPreviousPage}
          disabled={currentPage <= 1}
          className="bg-blue-500 text-white hover:bg-blue-600 disabled:bg-gray-300"
        >
          Back
        </Button>
        <div className="text-lg font-semibold">
          Page {currentPage} of {totalPages}
        </div>
        <Button
          onClick={onNextPage}
          disabled={currentPage >= totalPages}
          className="bg-blue-500 text-white hover:bg-blue-600 disabled:bg-gray-300"
        >
          Next Page
        </Button>
      </div>
    </div>
  );
};
