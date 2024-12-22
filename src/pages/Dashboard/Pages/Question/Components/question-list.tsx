import React, { useEffect, useRef } from "react";
import { AdminQuestionCard } from "./admin-question-card";
import { Question } from "@/types/ApiTypes";
import { FolderMinus } from "lucide-react";
import { useVirtualizer } from "@tanstack/react-virtual";

interface QuestionListProps {
  questions: Question[];
  onScrollEnd?: () => void; // New prop for infinite scroll
}

export const QuestionList: React.FC<QuestionListProps> = ({ questions, onScrollEnd }) => {
  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: questions.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 200,
    overscan: 5,
  });

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
    <div ref={parentRef} className="h-[600px] overflow-auto">
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualItem) => (
          <div
            key={virtualItem.key}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: `${virtualItem.size}px`,
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            <AdminQuestionCard
              key={questions[virtualItem.index].id}
              question={questions[virtualItem.index]}
            />
          </div>
        ))}
      </div>
    </div>
  );
};
