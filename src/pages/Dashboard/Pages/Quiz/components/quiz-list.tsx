import React from "react";
import { Quiz } from "@/types/ApiTypes";
import { FolderMinus } from "lucide-react";
import { QuizCard } from "./quiz-card";

interface QuizListProps {
  quizzes: Quiz[];
}

export const QuizList: React.FC<QuizListProps> = ({ quizzes }) => {
  if (quizzes.length === 0) {
    return (
      <div className="col-span-full flex flex-col items-center justify-center text-center p-12 rounded-lg">
        <FolderMinus size={48} className="mb-4" />
        <p className="text-xl font-semibold">No quizzes found.</p>
        <p className="text-sm mt-2">
          Try adjusting your search or filter to find what you're looking for.
        </p>
      </div>
    );
  }

  return (
    <div className="h-fit overflow-auto p-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {quizzes.map((quiz) => (
          <div key={quiz.id} className="w-full">
            <QuizCard quiz={quiz} />
          </div>
        ))}
      </div>
    </div>
  );
};
