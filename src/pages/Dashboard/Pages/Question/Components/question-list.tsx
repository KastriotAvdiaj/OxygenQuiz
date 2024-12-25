import React, { useEffect, useRef } from "react";
import { Question } from "@/types/ApiTypes";
import { FolderMinus } from "lucide-react";
import { NormalQuestionCard } from "./normal-question-card";

interface QuestionListProps {
  questions: Question[];
  onScrollEnd?: () => void; // New prop for infinite scroll
}

export const QuestionList: React.FC<QuestionListProps> = ({
  questions,
  onScrollEnd,
}) => {
  const parentRef = useRef<HTMLDivElement>(null);

  // Monitor scrolling to detect when user reaches the bottom
  useEffect(() => {
    const handleScroll = () => {
      if (!parentRef.current || !onScrollEnd) return;

      const { scrollTop, scrollHeight, clientHeight } = parentRef.current;
      if (scrollTop + clientHeight >= scrollHeight - 10) {
        onScrollEnd(); // Trigger the callback
      }
    };

    const parent = parentRef.current;
    if (parent) parent.addEventListener("scroll", handleScroll);

    return () => {
      if (parent) parent.removeEventListener("scroll", handleScroll);
    };
  }, [onScrollEnd]);

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
    <div ref={parentRef} className="h-[100vh] overflow-auto p-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {questions.map((question) => (
          <div key={question.id} className="w-full">
            <NormalQuestionCard question={question} />
          </div>
        ))}
      </div>
    </div>
  );
};
